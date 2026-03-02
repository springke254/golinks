package com.golinks.golinks.security

import com.golinks.golinks.entity.User
import com.golinks.golinks.repository.UserRepository
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

@Service
class CustomUserDetailsService(
    private val userRepository: UserRepository
) : UserDetailsService {

    override fun loadUserByUsername(email: String): UserDetails {
        val user = userRepository.findByEmail(email)
            ?: throw UsernameNotFoundException("User not found with email: $email")

        return buildUserDetails(user)
    }

    fun loadUserById(id: java.util.UUID): UserDetails {
        val user = userRepository.findById(id)
            .orElseThrow { UsernameNotFoundException("User not found with id: $id") }

        return buildUserDetails(user)
    }

    private fun buildUserDetails(user: User): UserDetails {
        return org.springframework.security.core.userdetails.User.builder()
            .username(user.email)
            .password(user.passwordHash ?: "")
            .authorities(listOf(SimpleGrantedAuthority("ROLE_USER")))
            .accountLocked(user.accountLocked)
            .disabled(false)
            .build()
    }
}
