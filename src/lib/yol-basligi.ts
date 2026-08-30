/**
 * Middleware'in isteğe eklediği yol başlığı.
 *
 * Server Component'ler istek yolunu doğrudan okuyamaz. Admin layout'unun
 * giriş sayfasında yönlendirme döngüsü kurmaması için yola ihtiyacı var.
 * Değer her istekte middleware tarafından yeniden yazılır; istemciden gelen
 * aynı adlı bir başlık üzerine yazılır, bu yüzden taklit edilemez.
 */
export const YOL_BASLIGI = "x-arkvium-yol";
