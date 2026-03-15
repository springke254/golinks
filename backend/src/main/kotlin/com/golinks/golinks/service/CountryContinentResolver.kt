package com.golinks.golinks.service

object CountryContinentResolver {
    private val AFRICA = setOf(
        "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CD", "CG", "CI", "DJ",
        "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG",
        "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO",
        "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH", "ZM", "ZW"
    )

    private val EUROPE = setOf(
        "AL", "AD", "AM", "AT", "AZ", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK", "EE", "FI",
        "FR", "GE", "DE", "GR", "HU", "IS", "IE", "IT", "KZ", "XK", "LV", "LI", "LT", "LU", "MT",
        "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES",
        "SE", "CH", "TR", "UA", "GB", "VA"
    )

    private val ASIA = setOf(
        "AF", "BH", "BD", "BT", "BN", "KH", "CN", "TL", "HK", "IN", "ID", "IR", "IQ", "IL", "JP",
        "JO", "KW", "KG", "LA", "LB", "MO", "MY", "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS",
        "PH", "QA", "SA", "SG", "KR", "LK", "SY", "TW", "TJ", "TH", "AE", "UZ", "VN", "YE"
    )

    private val NORTH_AMERICA = setOf(
        "AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD", "GT", "HT", "HN", "JM",
        "MX", "NI", "PA", "KN", "LC", "VC", "TT", "US"
    )

    private val SOUTH_AMERICA = setOf(
        "AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE", "FK", "GF"
    )

    private val OCEANIA = setOf(
        "AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH", "FM", "NR", "NC", "NZ", "NU", "MP", "PW",
        "PG", "WS", "SB", "TK", "TO", "TV", "VU", "WF"
    )

    fun resolve(countryCode: String?): String {
        val normalized = countryCode?.trim()?.uppercase().orEmpty()
        if (normalized.isBlank() || normalized == "ZZ") return "Unknown"

        return when {
            normalized in AFRICA -> "Africa"
            normalized in EUROPE -> "Europe"
            normalized in ASIA -> "Asia"
            normalized in NORTH_AMERICA -> "North America"
            normalized in SOUTH_AMERICA -> "South America"
            normalized in OCEANIA -> "Oceania"
            normalized == "AQ" -> "Antarctica"
            else -> "Unknown"
        }
    }
}
