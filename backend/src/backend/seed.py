"""Starter catalogue, the same products as the frontends' mock-data.ts."""

from decimal import Decimal

from backend.schemas import Product


def _p(id: str, name: str, description: str, category: str, price: int, unit: str, stock: int) -> Product:
    return Product(
        id=id,
        name=name,
        description=description,
        category=category,
        price=Decimal(price),
        unit=unit,
        stock=stock,
        image_url=None,
        is_active=True,
    )


THAI = "ผลไม้ไทย"
IMPORTED = "ผลไม้นำเข้า"

SEED_PRODUCTS: list[Product] = [
    _p("p-mango", "มะม่วงน้ำดอกไม้", "มะม่วงน้ำดอกไม้สุกกำลังดี หวานหอม เนื้อเนียน เหมาะกับข้าวเหนียวมะม่วง", THAI, 89, "กก.", 40),
    _p("p-banana", "กล้วยหอมทอง", "กล้วยหอมทองปลอดสาร ผิวสวย หวานหอม", THAI, 55, "หวี", 25),
    _p("p-pineapple", "สับปะรดภูแล", "สับปะรดภูแลจากเชียงราย ลูกเล็ก หวานกรอบ ไม่กัดลิ้น", THAI, 35, "ลูก", 60),
    _p("p-coconut", "มะพร้าวน้ำหอม", "มะพร้าวน้ำหอมราชบุรี น้ำหวานหอมชื่นใจ เนื้อนุ่ม", THAI, 30, "ลูก", 80),
    _p("p-watermelon", "แตงโมจินตหรา", "แตงโมเนื้อแดง ฉ่ำน้ำ หวานเย็น", THAI, 25, "กก.", 8),
    _p("p-orange", "ส้มสายน้ำผึ้ง", "ส้มสายน้ำผึ้งจากฝาง เปลือกบาง หวานอมเปรี้ยว", THAI, 79, "กก.", 35),
    _p("p-apple", "แอปเปิ้ลฟูจิ", "แอปเปิ้ลฟูจินำเข้า กรอบ หวาน ฉ่ำน้ำ", IMPORTED, 129, "กก.", 30),
    _p("p-grape", "องุ่นไชน์มัสแคท", "องุ่นเขียวไร้เมล็ด กลิ่นหอม หวานกรอบ", IMPORTED, 290, "พวง", 12),
    _p("p-strawberry", "สตรอว์เบอร์รี่เกาหลี", "สตรอว์เบอร์รี่ลูกใหญ่ หวานหอม บรรจุกล่อง 250 กรัม", IMPORTED, 199, "กล่อง", 5),
    _p("p-kiwi", "กีวีโกลด์", "กีวีเนื้อสีทอง หวานกว่ากีวีเขียว วิตามินซีสูง", IMPORTED, 159, "แพ็ก", 0),
]
