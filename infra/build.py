"""Build the deployment bundle for AWS (see infra/README.md).

    python infra/build.py

Produces dist/aof-bundle.zip containing:
    template.yaml, deploy.sh, destroy.sh  CloudFormation stack and CloudShell scripts
    lambda.zip                            backend + Linux wheels for the python3.12 runtime
    web/                                  storefront static export (bucket root, /)
    web/admin/                            admin dashboard static export (/admin)

Requires uv and Node.js. Written in Python rather than shell so it runs the same
on Windows (Git Bash rewrites values like "/api" into Windows paths).
"""

import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INFRA = ROOT / "infra"
DIST = ROOT / "dist"
BUNDLE_DIR = DIST / "bundle"
BUNDLE_ZIP = DIST / "aof-bundle.zip"
PARTS_DIR = DIST / "parts"
PART_BYTES = 9 * 1024 * 1024

LAMBDA_PYTHON = "3.12"  # keep in sync with Runtime in template.yaml
LAMBDA_PLATFORM = "x86_64-manylinux_2_28"  # Amazon Linux 2023, x86_64
# Left out of the Lambda package: the AWS SDK ships with the runtime, and the
# uvicorn[standard] extras only speed up the local dev server (uvicorn itself
# stays, backend/__init__.py imports it).
LAMBDA_EXCLUDED = {
    "boto3", "botocore", "s3transfer", "jmespath",
    "uvloop", "httptools", "watchfiles", "websockets",
}  # fmt: skip
# The API Gateway URL only exists after the stack is created, so the sites are
# built with this placeholder and deploy.sh swaps in the real URL.
API_URL_PLACEHOLDER = "https://aof-api-placeholder.invalid/api"
ADMIN_BASE_PATH = "/admin"
SCRIPTS = ("template.yaml", "deploy.sh", "destroy.sh")


def tool(name: str) -> str:
    found = shutil.which(name) or shutil.which(str(Path.home() / ".local" / "bin" / name))
    if not found:
        sys.exit(f"{name} not found on PATH")
    return found


def run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    print(f"$ {' '.join(cmd)}  (in {cwd.relative_to(ROOT)})", flush=True)
    subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, check=True)


def zip_dir(src: Path, dest: Path) -> None:
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(src.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                zf.write(path, path.relative_to(src).as_posix())


def build_lambda() -> None:
    uv = tool("uv")
    backend = ROOT / "backend"
    work = DIST / "lambda"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)

    requirements = DIST / "lambda-requirements.txt"
    run(
        [uv, "export", "--frozen", "--no-dev", "--no-emit-project", "--no-hashes", "-o", str(requirements)],
        cwd=backend,
    )
    lines = requirements.read_text(encoding="utf-8").splitlines()
    kept = [line for line in lines if line.split("==")[0].strip().lower() not in LAMBDA_EXCLUDED]
    requirements.write_text("\n".join(kept) + "\n", encoding="utf-8")
    run(
        [
            uv, "pip", "install",
            "--target", str(work),
            "--python-platform", LAMBDA_PLATFORM,
            "--python-version", LAMBDA_PYTHON,
            "--only-binary", ":all:",
            "-r", str(requirements),
        ],
        cwd=backend,
    )  # fmt: skip
    shutil.copytree(backend / "src" / "backend", work / "backend", ignore=shutil.ignore_patterns("__pycache__"))
    zip_dir(work, BUNDLE_DIR / "lambda.zip")


def build_site(app_dir: str, dest: Path, extra_env: dict[str, str]) -> None:
    app = ROOT / app_dir
    if not (app / "node_modules").is_dir():
        run([tool("npm"), "ci", "--no-audit", "--no-fund"], cwd=app)
    out = app / "out"
    shutil.rmtree(out, ignore_errors=True)
    # Stale route types from `next dev` can break the type check after routes move.
    shutil.rmtree(app / ".next" / "dev" / "types", ignore_errors=True)
    run(
        [tool("npx"), "next", "build"],
        cwd=app,
        env={"NEXT_OUTPUT": "export", "NEXT_PUBLIC_API_URL": API_URL_PLACEHOLDER, **extra_env},
    )
    shutil.copytree(out, dest)


def main() -> None:
    shutil.rmtree(BUNDLE_DIR, ignore_errors=True)
    BUNDLE_ZIP.unlink(missing_ok=True)
    BUNDLE_DIR.mkdir(parents=True)

    for name in SCRIPTS:
        # CloudShell is Linux: force LF line endings regardless of the checkout.
        text = (INFRA / name).read_text(encoding="utf-8").replace("\r\n", "\n")
        (BUNDLE_DIR / name).write_text(text, encoding="utf-8", newline="\n")

    build_lambda()
    build_site("frontend", BUNDLE_DIR / "web", {})
    build_site("frontend-admin", BUNDLE_DIR / "web" / "admin", {"NEXT_PUBLIC_BASE_PATH": ADMIN_BASE_PATH})

    zip_dir(BUNDLE_DIR, BUNDLE_ZIP)
    size_mb = BUNDLE_ZIP.stat().st_size / 1024 / 1024
    print(f"\nBundle: {BUNDLE_ZIP} ({size_mb:.1f} MB)")
    split_bundle()


def split_bundle() -> None:
    """Also write the bundle in chunks, for uploaders with a per-file size limit.

    Reassemble in CloudShell with:  cat aof-bundle.zip.part-* > aof-bundle.zip
    """
    shutil.rmtree(PARTS_DIR, ignore_errors=True)
    PARTS_DIR.mkdir()
    data = BUNDLE_ZIP.read_bytes()
    for index, start in enumerate(range(0, len(data), PART_BYTES)):
        part = PARTS_DIR / f"{BUNDLE_ZIP.name}.part-{index:02d}"
        part.write_bytes(data[start : start + PART_BYTES])
        print(f"Part:   {part}")


if __name__ == "__main__":
    main()
