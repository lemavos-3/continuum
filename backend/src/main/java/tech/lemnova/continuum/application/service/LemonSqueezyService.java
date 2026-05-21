package tech.lemnova.continuum.application.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tech.lemnova.continuum.controller.dto.subscription.CheckoutResponse;

import java.util.Map;

@Service
public class LemonSqueezyService {

    private static final Logger log = LoggerFactory.getLogger(LemonSqueezyService.class);

    private final RestTemplate restTemplate;
    private final String apiKey;
    private final String storeId;
    private final String successUrl;
    private final String cancelUrl;
    private final String variantVision;

    public LemonSqueezyService(
            @Value("${lemonsqueezy.api.key}") String apiKey,
            @Value("${lemonsqueezy.store.id}") String storeId,
            @Value("${lemonsqueezy.checkout.success.url}") String successUrl,
            @Value("${lemonsqueezy.checkout.cancel.url}") String cancelUrl,
            @Value("${lemonsqueezy.variant.vision}") String variantVision) {
        this.apiKey = apiKey;
        this.storeId = storeId;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
        this.variantVision = variantVision;
        this.restTemplate = new RestTemplate();
    }

    public CheckoutResponse createCheckout(String userId, String email, String priceOrPlan) {
        String variantId = resolveVariantId(priceOrPlan);
        if (variantId == null || variantId.isBlank()) {
            throw new IllegalArgumentException("Unknown Lemon Squeezy variant or plan: " + priceOrPlan);
        }

        Map<String, Object> body = Map.of(
                "data", Map.of(
                        "type", "checkouts",
                        "attributes", Map.of(
                                "store_id", storeId,
                                "variant_id", variantId,
                                "customer", Map.of("email", email),
                                "redirect_url", successUrl,
                                "cancel_url", cancelUrl,
                                "metadata", Map.of("userId", userId)
                        )
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<LemonSqueezyCheckoutResponse> responseEntity = restTemplate.postForEntity(
                "https://api.lemonsqueezy.com/v1/checkouts",
                request,
                LemonSqueezyCheckoutResponse.class
        );

        LemonSqueezyCheckoutResponse response = responseEntity.getBody();
        if (response == null || response.getData() == null || response.getData().getAttributes() == null
                || response.getData().getAttributes().getUrl() == null) {
            log.error("Lemon Squeezy checkout creation returned invalid response");
            throw new RuntimeException("Failed to create Lemon Squeezy checkout");
        }

        return new CheckoutResponse(null, response.getData().getAttributes().getUrl());
    }

    private String resolveVariantId(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.startsWith("var_")) return value;
        return switch (value.toUpperCase()) {
            case "VISION" -> variantVision;
            default -> null;
        };
    }

    public static class LemonSqueezyCheckoutResponse {
        private LemonSqueezyCheckoutData data;

        public LemonSqueezyCheckoutData getData() {
            return data;
        }

        public void setData(LemonSqueezyCheckoutData data) {
            this.data = data;
        }
    }

    public static class LemonSqueezyCheckoutData {
        private LemonSqueezyCheckoutAttributes attributes;

        public LemonSqueezyCheckoutAttributes getAttributes() {
            return attributes;
        }

        public void setAttributes(LemonSqueezyCheckoutAttributes attributes) {
            this.attributes = attributes;
        }
    }

    public static class LemonSqueezyCheckoutAttributes {
        private String url;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }
    }
}
