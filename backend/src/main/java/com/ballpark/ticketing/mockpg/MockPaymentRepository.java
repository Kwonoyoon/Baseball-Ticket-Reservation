package com.ballpark.ticketing.mockpg;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MockPaymentRepository extends JpaRepository<MockPayment, Long> {

    /** 승인·환불은 같은 결제에 동시에 들어와도 한 번만 처리되도록 잠그고 읽는다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from MockPayment p where p.paymentKey = :paymentKey")
    Optional<MockPayment> findForUpdateByPaymentKey(@Param("paymentKey") String paymentKey);

    Optional<MockPayment> findByPaymentKey(String paymentKey);

    @Query("select p from MockPayment p where p.status = :status and p.requestedAt < :before")
    List<MockPayment> findAllByStatusRequestedBefore(@Param("status") MockPaymentStatus status,
            @Param("before") LocalDateTime before);
}
