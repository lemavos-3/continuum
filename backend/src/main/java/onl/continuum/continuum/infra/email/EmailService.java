package onl.continuum.continuum.infra.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Sends transactional emails through the Resend HTTP API.
 * Sending is asynchronous and never throws to callers; failures are logged.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final URI RESEND_URI = URI.create("https://api.resend.com/emails");
    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm 'UTC'").withZone(ZoneOffset.UTC);

    private final String apiKey;
    private final String from;
    private final String appUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper mapper = new ObjectMapper();

    public EmailService(@Value("${resend.api-key:}") String apiKey,
                        @Value("${email.from:noreply@continuum.onl}") String from,
                        @Value("${app.url:http://localhost:5173}") String appUrl) {
        this.apiKey = apiKey;
        this.from = from;
        this.appUrl = appUrl;
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public CompletableFuture<Boolean> sendWelcome(String to, String name, String language) {
        LocaleBundle bundle = locale(language);
        String html = buildWelcomeEmail(name, language);
        return send(to, bundle.welcomeSubject(), html);
    }

    public String buildWelcomeEmail(String name, String language) {
        LocaleBundle bundle = locale(language);
        String who = esc(name == null || name.isBlank() ? bundle.defaultName() : name);
        String content = "<p><strong>" + bundle.greeting() + " " + who + ",</strong></p>"
                + "<p>" + bundle.welcomeParagraph1() + "</p>"
                + "<p>" + bundle.welcomeParagraph2() + "</p>"
                + "<p style=\"margin:24px 0 0\"><a href=\"" + esc(appUrl) + "\" style=\"display:inline-block;padding:12px 20px;background:#F3F1EB;color:#0B0A09;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:0.02em\">"
                + bundle.cta() + "</a></p>";
        return layout(bundle.languageCode(), bundle.welcomeTitle(), bundle.welcomeSubtitle(), content, bundle.footerLine(), appUrl);
    }

    public CompletableFuture<Boolean> sendDeletionScheduled(String to, String name, Instant purgeAt) {
        return sendDeletionScheduled(to, name, purgeAt, null);
    }

    public CompletableFuture<Boolean> sendDeletionScheduled(String to, String name, Instant purgeAt, String language) {
        LocaleBundle bundle = locale(language);
        String html = buildDeletionScheduledEmail(name, purgeAt, language);
        return send(to, bundle.deleteScheduledSubject(), html);
    }

    public String buildDeletionScheduledEmail(String name, Instant purgeAt, String language) {
        LocaleBundle bundle = locale(language);
        String who = esc(name == null || name.isBlank() ? bundle.defaultName() : name);
        String content = "<p><strong>" + bundle.deleteGreeting() + " " + who + ",</strong></p>"
                + "<p>" + bundle.deleteScheduledLine1().replace("{date}", DATE_FMT.format(purgeAt)) + "</p>"
                + "<p>" + bundle.deleteScheduledLine2() + "</p>"
                + "<p><a href=\"" + esc(appUrl) + "/settings\" style=\"display:inline-block;padding:12px 20px;background:#F3F1EB;color:#0B0A09;text-decoration:none;border-radius:999px;font-weight:700;letter-spacing:0.02em\">"
                + bundle.deleteCancelButton() + "</a></p>"
                + "<p style=\"color:#A3A19B;margin-top:18px\">" + bundle.deleteFootnote() + "</p>";
        return layout(bundle.languageCode(), bundle.deleteScheduledTitle(), bundle.deleteScheduledSubtitle(), content, bundle.footerLine(), appUrl);
    }

    public CompletableFuture<Boolean> sendAccountDeleted(String to, String name) {
        return sendAccountDeleted(to, name, null);
    }

    public CompletableFuture<Boolean> sendAccountDeleted(String to, String name, String language) {
        LocaleBundle bundle = locale(language);
        String html = buildAccountDeletedEmail(name, language);
        return send(to, bundle.accountDeletedSubject(), html);
    }

    public String buildAccountDeletedEmail(String name, String language) {
        LocaleBundle bundle = locale(language);
        String who = esc(name == null || name.isBlank() ? bundle.defaultName() : name);
        String content = "<p><strong>" + bundle.accountDeletedGreeting() + " " + who + ",</strong></p>"
                + "<p>" + bundle.accountDeletedParagraph1() + "</p>"
                + "<p>" + bundle.accountDeletedParagraph2() + "</p>";
        return layout(bundle.languageCode(), bundle.accountDeletedTitle(), bundle.accountDeletedSubtitle(), content, bundle.footerLine(), appUrl);
    }

    public CompletableFuture<Boolean> send(String to, String subject, String html) {
        if (!isEnabled() || to == null || to.isBlank()) {
            log.warn("Email not sent (Resend disabled or no recipient): {}", subject);
            return CompletableFuture.completedFuture(false);
        }
        try {
            String body = mapper.writeValueAsString(Map.of(
                    "from", from, "to", List.of(to), "subject", subject, "html", html));
            HttpRequest req = HttpRequest.newBuilder(RESEND_URI)
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                    .thenApply(res -> {
                        if (res.statusCode() / 100 == 2) return true;
                        log.error("Resend failed [{}]: {}", res.statusCode(), res.body());
                        return false;
                    })
                    .exceptionally(e -> { log.error("Resend request error", e); return false; });
        } catch (Exception e) {
            log.error("Failed to build email", e);
            return CompletableFuture.completedFuture(false);
        }
    }

    private static String layout(String languageCode, String title, String subtitle, String content, String footerLine, String appUrl) {
        String iconUrl = normalizeAppUrl(appUrl) + "/icon-transparent.png";
        return "<div lang=\"" + esc(languageCode) + "\" style=\"margin:0;padding:40px 20px;background:#0B0A09;font-family:Inter,Arial,sans-serif;color:#EAE8E2\">"
                + "<div style=\"max-width:560px;margin:0 auto;background:#111111;border:1px solid rgba(243,241,235,0.12);border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,0.28)\">"
                + "<div style=\"padding:20px 24px 10px;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(243,241,235,0.08)\">"
                + "<img src=\"" + esc(iconUrl) + "\" alt=\"Continuum\" width=\"28\" height=\"28\" style=\"display:block;width:28px;height:28px;border-radius:8px\" />"
                + "<span style=\"font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#F3F1EB\">Continuum</span>"
                + "</div>"
                + "<div style=\"padding:24px 24px 28px\">"
                + "<h1 style=\"margin:0 0 12px;font-size:32px;line-height:1.18;font-weight:700;color:#F3F1EB\">" + title + "</h1>"
                + "<p style=\"margin:0 0 22px;font-size:14px;line-height:1.6;color:#A3A19B\">" + subtitle + "</p>"
                + "<div style=\"background:#F3F1EB;color:#1D1B18;padding:24px;border-radius:14px;border:1px solid rgba(18,17,16,0.08);font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.7\">" + content + "</div>"
                + "<p style=\"margin:24px 0 0;font-size:12px;line-height:1.5;color:#726F69;text-align:center\">" + footerLine + "</p>"
                + "</div></div></div>";
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static String normalizeAppUrl(String appUrl) {
        if (appUrl == null || appUrl.isBlank()) return "https://continuum.onl";
        String url = appUrl.trim();
        if (url.endsWith("/")) url = url.substring(0, url.length() - 1);
        return url;
    }

    private static LocaleBundle locale(String language) {
        String code = normalizeLanguage(language);
        return switch (code) {
            case "es" -> new LocaleBundle(
                    "es",
                    "Hola",
                    "Bienvenido a Continuum",
                    "Tu espacio de conocimiento está listo para crecer.",
                    "Bienvenido",
                    "Tu espacio de conocimiento está listo para crecer.",
                    "Comienza a construir tu grafo ahora mismo.",
                    "Abrir Continuum",
                    "Bienvenido a Continuum",
                    "Tu cuenta está programada para eliminación",
                    "Tu cuenta de Continuum se eliminará permanentemente en breve.",
                    "Hola",
                    "Tu cuenta de Continuum se eliminará permanentemente el {date}",
                    "Te avisaremos antes de que todo se borre.",
                    "Cancelar eliminación",
                    "Si no pediste esto, cancélalo ahora mismo.",
                    "Tu cuenta está programada para eliminarse",
                    "Tu cuenta de Continuum",
                    "Tu cuenta y todos tus datos han sido eliminados.",
                    "Hola",
                    "Tu cuenta y todos tus datos han sido eliminados.",
                    "Gracias por usar Continuum.",
                    "Tu cuenta de Continuum ha sido eliminada",
                    "Tu cuenta de Continuum ha sido eliminada",
                    "Continuum • Tu espacio de pensamiento"
            );
            case "pt" -> new LocaleBundle(
                    "pt",
                    "Olá",
                    "Bem-vindo ao Continuum",
                    "Seu espaço de conhecimento está pronto para crescer.",
                    "Bem-vindo",
                    "Seu espaço de conhecimento está pronto para crescer.",
                    "Comece a construir seu grafo agora mesmo.",
                    "Abrir Continuum",
                    "Bem-vindo ao Continuum",
                    "Sua conta está agendada para exclusão",
                    "Seu espaço de conhecimento está pronto para crescer.",
                    "Olá",
                    "Sua conta do Continuum está programada para ser excluída em {date}",
                    "Vamos avisar antes que tudo seja apagado.",
                    "Cancelar exclusão",
                    "Se você não pediu isso, cancele agora mesmo.",
                    "Sua conta está agendada para exclusão",
                    "Sua conta do Continuum",
                    "Sua conta e todos os seus dados foram excluídos.",
                    "Olá",
                    "Sua conta e todos os seus dados foram excluídos.",
                    "Obrigado por usar o Continuum.",
                    "Sua conta do Continuum foi excluída",
                    "Sua conta do Continuum foi excluída",
                    "Continuum • Seu espaço de pensamento"
            );
            case "fr" -> new LocaleBundle(
                    "fr",
                    "Bonjour",
                    "Bienvenue dans Continuum",
                    "Votre espace de pensée est prêt à grandir.",
                    "Bienvenue",
                    "Votre espace de pensée est prêt à grandir.",
                    "Commencez à construire votre graphe dès maintenant.",
                    "Ouvrir Continuum",
                    "Bienvenue dans Continuum",
                    "Votre compte est planifié pour suppression",
                    "Votre espace de pensée est prêt à grandir.",
                    "Bonjour",
                    "Votre compte Continuum est programmé pour être supprimé le {date}",
                    "Nous vous préviendrons avant que tout soit effacé.",
                    "Annuler la suppression",
                    "Si vous ne l'avez pas demandé, annulez immédiatement.",
                    "Votre compte est planifié pour suppression",
                    "Votre compte Continuum",
                    "Votre compte et toutes vos données ont été supprimés.",
                    "Bonjour",
                    "Votre compte et toutes vos données ont été supprimés.",
                    "Merci d'utiliser Continuum.",
                    "Votre compte Continuum a été supprimé",
                    "Votre compte Continuum a été supprimé",
                    "Continuum • Votre espace de pensée"
            );
            default -> new LocaleBundle(
                    "en",
                    "there",
                    "Welcome to Continuum",
                    "Your knowledge workspace is ready to grow.",
                    "Welcome",
                    "Your knowledge workspace is ready to grow.",
                    "Start building your graph right away.",
                    "Open Continuum",
                    "Welcome to Continuum",
                    "Your account is scheduled for deletion",
                    "Your knowledge workspace is ready to grow.",
                    "Hi",
                    "Your Continuum account is scheduled for permanent deletion on {date}",
                    "We’ll reach out before everything is erased.",
                    "Cancel deletion",
                    "If you didn’t request this, cancel it immediately.",
                    "Your account is scheduled for deletion",
                    "Your Continuum account",
                    "Hi",
                    "Your account and all its data have been deleted.",
                    "Thank you for using Continuum.",
                    "Your Continuum account has been deleted",
                    "Your Continuum account has been deleted",
                    "Continuum • Your thinking space"
            );
        };
    }

    private static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) return "en";
        String code = language.trim().toLowerCase(Locale.ROOT);
        if (code.length() > 2 && code.contains("-")) code = code.substring(0, code.indexOf('-'));
        return switch (code) {
            case "es", "pt", "fr" -> code;
            default -> "en";
        };
    }

    private record LocaleBundle(String languageCode,
                                String defaultName,
                                String welcomeTitle,
                                String welcomeSubtitle,
                                String greeting,
                                String welcomeParagraph1,
                                String welcomeParagraph2,
                                String cta,
                                String welcomeSubject,
                                String deleteScheduledTitle,
                                String deleteScheduledSubtitle,
                                String deleteGreeting,
                                String deleteScheduledLine1,
                                String deleteScheduledLine2,
                                String deleteCancelButton,
                                String deleteFootnote,
                                String deleteScheduledSubject,
                                String accountDeletedTitle,
                                String accountDeletedSubtitle,
                                String accountDeletedGreeting,
                                String accountDeletedParagraph1,
                                String accountDeletedParagraph2,
                                String accountDeletedSubject,
                                String footerLine) {}
}
