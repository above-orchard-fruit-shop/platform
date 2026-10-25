"""Product image uploads straight from the browser to S3 via presigned POST.

The API never handles the file bytes: it signs a short-lived POST policy that
only allows one object key, one content type and a maximum size, and the
browser sends the file to S3 itself.
"""

from typing import TYPE_CHECKING, Annotated
from uuid import uuid4

from fastapi import Depends, Request

from backend.errors import PayloadTooLargeError
from backend.schemas import ImageContentType, ImageUploadRequest, ImageUploadTicket

if TYPE_CHECKING:
    from mypy_boto3_s3.client import S3Client

EXTENSIONS: dict[ImageContentType, str] = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
EXPIRES_IN_SECONDS = 300


class ImageUploader:
    def __init__(self, client: "S3Client", *, bucket: str, public_base_url: str, max_bytes: int) -> None:
        self._s3 = client
        self._bucket = bucket
        self._public_base_url = public_base_url
        self._max_bytes = max_bytes

    def presign(self, req: ImageUploadRequest) -> ImageUploadTicket:
        if req.size > self._max_bytes:
            raise PayloadTooLargeError(f"ไฟล์ใหญ่เกินไป (สูงสุด {self._max_bytes // (1024 * 1024)} MB)")

        key = f"products/{uuid4().hex}.{EXTENSIONS[req.content_type]}"
        # Signing is local (no network call), so it is fine to run on the event loop.
        post = self._s3.generate_presigned_post(
            Bucket=self._bucket,
            Key=key,
            Fields={"Content-Type": req.content_type},
            Conditions=[
                {"Content-Type": req.content_type},
                ["content-length-range", 1, self._max_bytes],
            ],
            ExpiresIn=EXPIRES_IN_SECONDS,
        )
        return ImageUploadTicket(
            upload_url=post["url"],
            fields=post["fields"],
            image_url=f"{self._public_base_url}/{key}",
            expires_in=EXPIRES_IN_SECONDS,
        )


def get_image_uploader(request: Request) -> ImageUploader:
    uploader: ImageUploader = request.app.state.images
    return uploader


ImageUploaderDep = Annotated[ImageUploader, Depends(get_image_uploader)]
