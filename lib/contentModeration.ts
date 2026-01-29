/**
 * Content Moderation Utility
 * 
 * Client-side content filtering for profanity, hate speech, 
 * nudity-related terms, and anti-Christian content.
 * 
 * Note: For production, consider adding server-side validation
 * using APIs like Perspective API or OpenAI Moderation.
 */

// Profanity and curse words (partial list - expandable)
const PROFANITY_WORDS = [
    'fuck', 'fucking', 'fucked', 'fucker', 'fck',
    'shit', 'shitting', 'bullshit', 'bs',
    'ass', 'asshole', 'arse',
    'bitch', 'bitches', 'bastard',
    'damn', 'dammit', 'goddamn',
    'crap', 'piss', 'pissed',
    'dick', 'cock', 'pussy', 'cunt',
    'whore', 'slut', 'hoe',
    'nigga', 'nigger', 'negro',
    'fag', 'faggot', 'retard', 'retarded',
]

// Hate speech and discriminatory terms
const HATE_SPEECH_WORDS = [
    'kill all', 'death to', 'murder',
    'genocide', 'ethnic cleansing',
    'supremacy', 'inferior race',
    'hate all', 'burn in hell',
    'terrorist', 'extremist',
]

// Anti-Christian content
const ANTI_CHRISTIAN_WORDS = [
    'god is dead', 'jesus is fake', 'christianity is a lie',
    'bible is false', 'church is evil', 'christians are stupid',
    'religion is poison', 'faith is delusion',
    'curse god', 'damn god', 'hate jesus',
    'satan worship', 'hail satan', 'devil worship',
]

// Nudity and explicit content
const NUDITY_WORDS = [
    'naked', 'nude', 'nudity',
    'porn', 'pornography', 'xxx',
    'sex', 'sexual', 'erotic',
    'orgasm', 'masturbat',
    'genitals', 'breasts', 'nipple',
]

export interface ModerationResult {
    isClean: boolean
    violations: {
        type: 'profanity' | 'hate_speech' | 'anti_christian' | 'nudity'
        words: string[]
    }[]
}

/**
 * Check if text contains any words from a given list
 */
function findViolations(text: string, wordList: string[]): string[] {
    const lowerText = text.toLowerCase()
    const found: string[] = []

    for (const word of wordList) {
        // Use word boundary matching for more accurate detection
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        if (regex.test(lowerText)) {
            found.push(word)
        }
    }

    return found
}

/**
 * Moderate content for inappropriate language
 * @param content - Text content to check
 * @returns ModerationResult with isClean status and any violations found
 */
export function moderateContent(content: string): ModerationResult {
    const violations: ModerationResult['violations'] = []

    // Check profanity
    const profanityFound = findViolations(content, PROFANITY_WORDS)
    if (profanityFound.length > 0) {
        violations.push({ type: 'profanity', words: profanityFound })
    }

    // Check hate speech
    const hateFound = findViolations(content, HATE_SPEECH_WORDS)
    if (hateFound.length > 0) {
        violations.push({ type: 'hate_speech', words: hateFound })
    }

    // Check anti-Christian content
    const antiChristianFound = findViolations(content, ANTI_CHRISTIAN_WORDS)
    if (antiChristianFound.length > 0) {
        violations.push({ type: 'anti_christian', words: antiChristianFound })
    }

    // Check nudity/explicit content
    const nudityFound = findViolations(content, NUDITY_WORDS)
    if (nudityFound.length > 0) {
        violations.push({ type: 'nudity', words: nudityFound })
    }

    return {
        isClean: violations.length === 0,
        violations
    }
}

/**
 * Get a user-friendly error message based on violations
 */
export function getViolationMessage(result: ModerationResult): string {
    if (result.isClean) return ''

    const messages: string[] = []

    for (const violation of result.violations) {
        switch (violation.type) {
            case 'profanity':
                messages.push('Your post contains profanity or cursing')
                break
            case 'hate_speech':
                messages.push('Your post contains hate speech or violent language')
                break
            case 'anti_christian':
                messages.push('Your post contains content that goes against Christian values')
                break
            case 'nudity':
                messages.push('Your post contains inappropriate or explicit content')
                break
        }
    }

    return messages.join('. ') + '. Please revise your post to maintain a positive, uplifting environment.'
}

/**
 * Moderate multiple fields at once (e.g., all post fields)
 */
export function moderatePost(fields: { [key: string]: string | string[] | null | undefined }): ModerationResult {
    const allViolations: ModerationResult['violations'] = []

    for (const key in fields) {
        const value = fields[key]
        if (!value) continue

        // Handle arrays (like prayer points)
        if (Array.isArray(value)) {
            for (const item of value) {
                const result = moderateContent(item)
                allViolations.push(...result.violations)
            }
        } else {
            const result = moderateContent(value)
            allViolations.push(...result.violations)
        }
    }

    // Deduplicate violations by type
    const uniqueViolations = allViolations.reduce((acc, curr) => {
        const existing = acc.find(v => v.type === curr.type)
        if (existing) {
            existing.words = [...new Set([...existing.words, ...curr.words])]
        } else {
            acc.push({ ...curr, words: [...curr.words] })
        }
        return acc
    }, [] as ModerationResult['violations'])

    return {
        isClean: uniqueViolations.length === 0,
        violations: uniqueViolations
    }
}
