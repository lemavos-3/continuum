package tech.lemnova.continuum.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.SubscriptionService;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@RestController
@RequestMapping("/api/webhooks")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    @Value("${lemonsqueezy.webhook.secret}")
    private String webhookSecret;

    private final SubscriptionService subscriptionService;
    private final ObjectMapper mapper = new ObjectMapper();

    public StripeWebhookController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping("/stripe")
    public ResponseEntity<String> stripe(
            @RequestBody String payload,
            @RequestHeader("Lemon-Squeezy-Signature") String signature) {

        if (!verifySignature(payload, signature)) {
            log.error("Invalid Lemon Squeezy signature");
            return ResponseEntity.status(400).body("Invalid signature");
        }

        try {
            JsonNode root = mapper.readTree(payload);
            String eventType = root.path("data").path("attributes").path("event_type").asText(null);
            String eventId = root.path("data").path("id").asText(null);
            log.info("Lemon Squeezy event: {} [{}]", eventType, eventId);
            subscriptionService.handleLemonSqueezyWebhook(root);
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("processing error");
        }

        return ResponseEntity.ok("ok");
    }

    private boolean verifySignature(String payload, String signatureHeader) {
        try {
            if (signatureHeader.startsWith("sha256=")) {
                signatureHeader = signatureHeader.substring(7);
            }
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = bytesToHex(digest);
            return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
                    signatureHeader.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Webhook signature verification error", e);
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// [ARCH-2] VaultController — GET /api/vault/entity-index
// ─────────────────────────────────────────────────────────────────────────────
