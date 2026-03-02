package com.golinks.golinks

import com.golinks.golinks.messaging.NotificationProducer
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
class GolinksApplicationTests {

	@MockBean
	private lateinit var notificationProducer: NotificationProducer

	@Test
	fun contextLoads() {
	}

}
