'use client'

interface CharacterCounterProps {
    current: number
    max: number
    label?: string
}

export default function CharacterCounter({ current, max, label }: CharacterCounterProps) {
    const percentage = (current / max) * 100
    let className = 'character-counter'

    if (percentage >= 100) {
        className += ' danger'
    } else if (percentage >= 80) {
        className += ' warning'
    } else {
        className += ' success'
    }

    return (
        <div className={className}>
            {label && <span>{label}</span>}
            <span>
                {current} / {max}
            </span>
        </div>
    )
}
