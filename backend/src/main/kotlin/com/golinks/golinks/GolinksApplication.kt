package com.golinks.golinks

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class GolinksApplication

fun main(args: Array<String>) {
	runApplication<GolinksApplication>(*args)
}
