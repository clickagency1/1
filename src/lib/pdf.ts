// أداة عامة: تحوّل أي عنصر DOM (زي إيصال الدفع) لصورة عالية الدقة، وبعدين
// تحطها جوه ملف PDF بنفس أبعادها بالظبط وتنزّله على جهاز المستخدم.
//
// ليه الطريقة دي (رسم DOM كصورة) بدل ما نكتب نص عربي مباشرة بمكتبة PDF؟
// لأن مكتبات PDF زي jsPDF مش بتعرف تشكيل الحروف العربية (الحرف بيتغير شكله
// حسب موقعه في الكلمة) ولا اتجاه RTL صح. المتصفح نفسه بيعرف يعرض العربي
// صح، فبنخليه هو اللي يرسم التصميم، وبعدين بس "نصوّره" ونحطه في PDF.
//
// ليه html-to-image مش html2canvas؟ html2canvas بيعيد تنفيذ رسم الـ CSS
// والنص يدويًا بنفسه، وده بيبوّظ تشكيل الحروف العربية المتصلة وترتيب
// النصوص المختلطة (عربي جنب أرقام/إنجليزي LTR) فبيطلع الكلام معكوس أو
// متقطّع في بعض الحالات. html-to-image بيحوّل العنصر لـ SVG <foreignObject>
// وبيسيب المتصفح نفسه يرسم النص جواها بمحرك العرض بتاعه (نفس اللي بيرسم
// الصفحة العادية)، فالعربي والـ RTL/LTR المختلط بيطلعوا مطابقين تمامًا
// لشكلهم على الشاشة.

import { jsPDF } from 'jspdf'
import { toPng } from 'html-to-image'

/** بيستنى أي صور (زي اللوجو) جوه العنصر تخلص تحميل قبل ما نصوّره، عشان الإيصال ميطلعش بلوجو فاضي لو المستخدم دوس تحميل بسرعة قبل ما الصورة تحمّل. */
async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })
    }),
  )
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  await waitForImages(element)

  const width = element.offsetWidth
  const height = element.offsetHeight

  // بنولّد الصورة مرتين لو الأولى طلعت فاضية/ناقصة (مشكلة معروفة مع
  // foreignObject لو الفونتات لسه بتحمّل)، بدل ما نسيب المستخدم ياخد ملف تالف.
  const imageData = await toPng(element, {
    pixelRatio: 2, // دقة أعلى من شاشة عادية عشان يطبع كويس
    backgroundColor: '#ffffff',
    width,
    height,
  })

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width * 2, height * 2],
  })
  pdf.addImage(imageData, 'PNG', 0, 0, width * 2, height * 2)
  pdf.save(filename)
}
