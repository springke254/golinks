package com.golinks.golinks

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class GolinksApplication

fun main(args: Array<String>) {
	runApplication<GolinksApplication>(*args)
}
