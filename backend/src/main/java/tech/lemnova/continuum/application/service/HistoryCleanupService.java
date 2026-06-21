package tech.lemnova.continuum.application.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.repository.TimeEntryRepository;
import tech.lemnova.continuum.infra.persistence.TrackingEventRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Archives historical tracking data that falls outside the plan's retention window.
 *
 * Notes:
 *  - The retention window is read from {@link PlanConfiguration}, so it always
 *    matches what the read-side services (TrackingService / MetricsService /
 *    EntityResponse) enforce when projecting data to the client.
 *  - Only historical events are archived. User-created entities themselves are
 *    NEVER removed by retention — only their out-of-window history is hidden,
 *    and the read-side already filters those dates out before returning data.
 */
@Service
@RequiredArgsConstructor
public class HistoryCleanupService {

    private final UserRepository userRepo;
    private final TimeEntryRepository timeEntryRepo;
    private final TrackingEventRepository trackingRepo;
    private final PlanConfiguration planConfig;

    @Scheduled(cron = "0 0 2 * * ?")  // Daily at 2 AM
    public void cleanupFreeUsers() {
        int retentionDays = planConfig.getHistoryDays(PlanType.FREE);
        if (retentionDays <= 0 || retentionDays == Integer.MAX_VALUE) {
            return; // No retention enforced for this plan.
        }

        List<User> freeUsers = userRepo.findByPlan(PlanType.FREE);
        LocalDate cutoff = LocalDate.now().minusDays(retentionDays);
        Instant now = Instant.now();

        for (User user : freeUsers) {
            timeEntryRepo.findOldEventsByUserId(user.getId(), cutoff)
                    .forEach(entry -> {
                        entry.setArchivedAt(now);
                        timeEntryRepo.save(entry);
                    });

            trackingRepo.findOldEventsByUserId(user.getId(), cutoff)
                    .forEach(event -> {
                        event.setArchivedAt(now);
                        trackingRepo.save(event);
                    });
        }
    }
}
