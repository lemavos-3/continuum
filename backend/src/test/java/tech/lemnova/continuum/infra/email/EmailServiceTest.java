package onl.continuum.continuum.infra.email;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import static org.assertj.core.api.Assertions.*;

class EmailServiceTest {

    @Test
    @DisplayName("welcome email is rendered with app styling and recipient locale")
    void welcomeEmailUsesAppBrandingAndLanguage() {
        EmailService emailService = new EmailService("test-key", "noreply@continuum.onl", "https://app.continuum.onl");

        String html = emailService.buildWelcomeEmail("João", "pt");

        assertThat(html)
            .contains("Continuum")
            .contains("Bem-vindo")
            .contains("https://app.continuum.onl")
            .contains("background:#0B0A09")
            .contains("font-family:Inter");
    }

    @Test
    @DisplayName("deletion emails follow the user's language")
    void deletionEmailsUseRecipientLanguage() {
        EmailService emailService = new EmailService("test-key", "noreply@continuum.onl", "https://app.continuum.onl");

        String scheduledHtml = emailService.buildDeletionScheduledEmail("Ana", java.time.Instant.parse("2026-10-20T12:00:00Z"), "es");
        String deletedHtml = emailService.buildAccountDeletedEmail("Ana", "es");

        assertThat(scheduledHtml)
            .contains("Tu cuenta")
            .contains("Cancelar eliminación");
        assertThat(deletedHtml)
            .contains("Tu cuenta de Continuum")
            .contains("Ha sido eliminada");
    }
}
