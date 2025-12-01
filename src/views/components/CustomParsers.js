const VALID_DAYS = {
  monday: 'Monday',
  mon: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  thursday: 'Thursday',
  thu: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  sunday: 'Sunday',
  sun: 'Sunday',
}

const VALID_MONTHS = {
  january: 'January',
  jan: 'January',
  february: 'February',
  feb: 'February',
  march: 'March',
  mar: 'March',
  april: 'April',
  apr: 'April',
  may: 'May',
  june: 'June',
  jun: 'June',
  july: 'July',
  jul: 'July',
  august: 'August',
  aug: 'August',
  september: 'September',
  sep: 'September',
  october: 'October',
  oct: 'October',
  november: 'November',
  nov: 'November',
  december: 'December',
  dec: 'December',
}

const ALL_MONTHS = Object.values(VALID_MONTHS).filter(
  (v, i, a) => a.indexOf(v) === i,
)

export const parsePriority = inputSentence => {
  let sentence = inputSentence.toLowerCase()
  const priorityMap = {
    1: ['!p1', 'priority 1', 'high priority', 'urgent', 'asap', 'important'],
    2: ['!p2', 'priority 2', 'medium priority'],
    3: ['!p3', 'priority 3', 'low priority'],
    4: ['!p4', 'priority 4'],
  }

  for (const [priority, terms] of Object.entries(priorityMap)) {
    if (terms.some(term => sentence.includes(term))) {
      return {
        result: priority,
        highlight: terms
          .map(term => {
            const index = sentence.indexOf(term)
            return {
              text: term,
              start: index,
              end: index + term.length,
            }
          })
          .filter(term => term.start !== -1),

        cleanedSentence: sentence.replace(
          new RegExp(`(${terms.join('|')})`, 'g'),
          '',
        ),
      }
    }
  }
  return {
    result: 0,
    highlight: [],
    cleanedSentence: inputSentence,
  }
}
export const parseLabels = (inputSentence, userLabels) => {
  let sentence = inputSentence.toLowerCase()
  const currentLabels = []
  const newLabels = []
  const allHighlights = []

  // Find all #label patterns in the sentence
  // Use [\p{L}\p{N}_]+ to support Unicode letters (including umlauts) and numbers
  const labelPattern = /#([\p{L}\p{N}_]+)/giu
  const matches = [...inputSentence.matchAll(labelPattern)]

  for (const match of matches) {
    const labelName = match[1]
    const fullMatch = match[0]
    const startIndex = match.index

    // Check if this label already exists
    const existingLabel = userLabels.find(
      label => label.name.toLowerCase() === labelName.toLowerCase(),
    )

    if (existingLabel) {
      currentLabels.push(existingLabel)
    } else {
      // Create a new label object for new labels
      newLabels.push({
        name: labelName,
        color: '#3b82f6', // Default blue color
        isNew: true,
      })
    }

    allHighlights.push({
      text: fullMatch,
      start: startIndex,
      end: startIndex + fullMatch.length,
    })

    // Remove the label from the sentence
    sentence = sentence.replace(fullMatch.toLowerCase(), '')
  }

  const allLabels = [...currentLabels, ...newLabels]

  if (allLabels.length > 0) {
    return {
      result: allLabels,
      newLabels: newLabels,
      highlight: allHighlights,
      cleanedSentence: inputSentence
        .replace(labelPattern, '')
        .replace(/\s+/g, ' ')
        .trim(),
    }
  }

  return {
    result: null,
    newLabels: [],
    cleanedSentence: inputSentence,
  }
}

export const parseRepeatV2 = inputSentence => {
  const sentence = inputSentence.toLowerCase()
  const lowerInputSentence = inputSentence.toLowerCase()
  const result = {
    frequency: 1,
    frequencyType: null,
    frequencyMetadata: {
      days: [],
      months: [],
      unit: null,
      time: new Date().toISOString(),
    },
  }

  const patterns = [
    {
      frequencyType: 'day_of_the_month:every',
      regex: /(\d+)(?:th|st|nd|rd)? of every month/i,
      name: 'Every {day} of every month',
    },
    {
      frequencyType: 'days_of_the_week:nth_occurrence',
      regex:
        /(first|second|third|fourth|last|\d+(?:st|nd|rd|th)?) (monday|tuesday|wednesday|thursday|friday|saturday|sunday) of (?:the )?month/i,
      name: '{occurrence} {day} of the month',
    },
    {
      frequencyType: 'days_of_the_week:nth_occurrence_multiple',
      regex:
        /((?:first|second|third|fourth|last|\d+(?:st|nd|rd|th)?)(?:,? (?:and |& )?))+\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s? of (?:the )?month/i,
      name: '{occurrences} {day} of the month',
    },
    {
      frequencyType: 'daily',
      regex: /(every day|daily|everyday)/i,
      name: 'Every day',
    },
    {
      frequencyType: 'daily:time',
      regex: /every (morning|noon|afternoon|evening|night)/i,
      name: 'Every {time} daily',
    },
    {
      frequencyType: 'weekly',
      regex: /(every week|weekly)/i,
      name: 'Every week',
    },
    {
      frequencyType: 'monthly',
      regex: /(every month|monthly)/i,
      name: 'Every month',
    },
    {
      frequencyType: 'yearly',
      regex: /every year/i,
      name: 'Every year',
    },
    {
      frequencyType: 'monthly',
      regex: /every (?:other )?month/i,
      name: 'Bi Monthly',
      value: 2,
    },
    {
      frequencyType: 'interval:2week',
      regex: /(bi-?weekly|every other week)/i,
      value: 2,
      name: 'Bi Weekly',
    },
    {
      frequencyType: 'interval',
      regex: /every (\d+) (days?|weeks?|months?|years?)/i,
      name: 'Every {frequency} {unit}',
    },
    {
      frequencyType: 'interval:every_other',
      regex: /every other (days?|weeks?|months?|years?)/i,
      name: 'Every other {unit}',
    },
    {
      frequencyType: 'days_of_the_week',
      regex: /every ([\w, ]+(?:day)?(?:, [\w, ]+(?:day)?)*)/i,
      name: 'Every {days}',
    },
    {
      frequencyType: 'day_of_the_month',
      regex: /(\d+)(?:st|nd|rd|th)? of ([\w ]+(?:(?:,| and |\s)[\w ]+)*)/i,
      name: 'Every {day} days of {months}',
    },
  ]

  for (const pattern of patterns) {
    const match = sentence.match(pattern.regex)
    if (!match) continue

    result.frequencyType = pattern.frequencyType
    const unitMap = {
      daily: 'days',
      weekly: 'weeks',
      monthly: 'months',
      yearly: 'years',
    }

    switch (pattern.frequencyType) {
      case 'daily':
      case 'weekly':
      case 'monthly':
      case 'yearly':
        result.frequencyType = 'interval'
        result.frequency = pattern.value || 1
        result.frequencyMetadata.unit = unitMap[pattern.frequencyType]
        return {
          result,
          name: pattern.name,
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'interval':
        result.frequency = parseInt(match[1], 10)
        result.frequencyMetadata.unit = match[2]
        return {
          result,
          name: pattern.name
            .replace('{frequency}', result.frequency)
            .replace('{unit}', result.frequencyMetadata.unit),
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'days_of_the_week':
        result.frequencyMetadata.days = match[1]
          .toLowerCase()
          .split(/ and |,|\s/)
          .map(day => day.trim())
          .filter(day => VALID_DAYS[day])
          .map(day => VALID_DAYS[day])
        if (!result.frequencyMetadata.days.length)
          return { result: null, name: null, cleanedSentence: inputSentence }
        return {
          result,
          name: pattern.name.replace(
            '{days}',
            result.frequencyMetadata.days.join(', '),
          ),
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'day_of_the_month':
        result.frequency = parseInt(match[1], 10)
        result.frequencyMetadata.months = match[2]
          .toLowerCase()
          .split(/ and |,|\s/)
          .map(month => month.trim())
          .filter(month => VALID_MONTHS[month])
          .map(month => VALID_MONTHS[month])
        result.frequencyMetadata.unit = 'days'
        return {
          result,
          name: pattern.name
            .replace('{day}', result.frequency)
            .replace('{months}', result.frequencyMetadata.months.join(', ')),
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }
      case 'interval:2week':
        result.frequency = 2
        result.frequencyMetadata.unit = 'weeks'
        result.frequencyType = 'interval'
        return {
          result,
          name: pattern.name,
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }
      case 'daily:time':
        result.frequency = 1
        result.frequencyMetadata.unit = 'days'
        result.frequencyType = 'daily'
        return {
          result,
          name: pattern.name.replace('{time}', match[1]),
          // replace every x with ''
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'day_of_the_month:every':
        result.frequency = parseInt(match[1], 10)
        result.frequencyMetadata.months = ALL_MONTHS
        result.frequencyMetadata.unit = 'days'
        return {
          result,
          name: pattern.name
            .replace('{day}', result.frequency)
            .replace('{months}', result.frequencyMetadata.months.join(', ')),
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }
      case 'interval:every_other':
        result.frequency = 2
        result.frequencyMetadata.unit = match[1]
        result.frequencyType = 'interval'
        return {
          result,
          name: pattern.name.replace('{unit}', result.frequencyMetadata.unit),
          highlight: [
            {
              text: pattern.name,
              start: lowerInputSentence.indexOf(match[0]),
              end: lowerInputSentence.indexOf(match[0]) + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'days_of_the_week:nth_occurrence':
        const occurrenceText = match[1].toLowerCase()
        const dayName = match[2].toLowerCase()

        // Map occurrence words to numbers
        const occurrenceMap = {
          first: 1,
          '1st': 1,
          second: 2,
          '2nd': 2,
          third: 3,
          '3rd': 3,
          fourth: 4,
          '4th': 4,
          last: -1,
        }

        const occurrence =
          occurrenceMap[occurrenceText] ||
          parseInt(occurrenceText.replace(/\D/g, ''), 10)

        if (!VALID_DAYS[dayName]) {
          return { result: null, name: null, cleanedSentence: inputSentence }
        }

        result.frequencyType = 'days_of_the_week'
        result.frequencyMetadata.days = [VALID_DAYS[dayName].toLowerCase()]
        result.frequencyMetadata.weekPattern = 'nth_day_of_month'
        result.frequencyMetadata.occurrences = [occurrence]

        const startIndex = inputSentence
          .toLowerCase()
          .indexOf(match[0].toLowerCase())
        return {
          result,
          name: pattern.name
            .replace('{occurrence}', match[1])
            .replace('{day}', VALID_DAYS[dayName]),
          highlight: [
            {
              text: inputSentence.substring(
                startIndex,
                startIndex + match[0].length,
              ),
              start: startIndex,
              end: startIndex + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }

      case 'days_of_the_week:nth_occurrence_multiple':
        const occurrencesText = match[1].toLowerCase()
        const dayName2 = match[2].toLowerCase()

        if (!VALID_DAYS[dayName2]) {
          return { result: null, name: null, cleanedSentence: inputSentence }
        }

        // Parse multiple occurrences like "first, second and third"
        const occurrences = occurrencesText
          .replace(/,?\s*(and|&)\s*/g, ' ')
          .split(/\s+/)
          .filter(word => word.trim())
          .map(word => {
            const cleanWord = word.replace(',', '').trim()
            const occurrenceMap = {
              first: 1,
              '1st': 1,
              second: 2,
              '2nd': 2,
              third: 3,
              '3rd': 3,
              fourth: 4,
              '4th': 4,
              last: -1,
            }
            return (
              occurrenceMap[cleanWord] ||
              parseInt(cleanWord.replace(/\D/g, ''), 10)
            )
          })
          .filter(num => !isNaN(num))

        result.frequencyType = 'days_of_the_week'
        result.frequencyMetadata.days = [VALID_DAYS[dayName2].toLowerCase()]
        result.frequencyMetadata.weekPattern = 'nth_day_of_month'
        result.frequencyMetadata.occurrences = occurrences

        const startIndex2 = inputSentence
          .toLowerCase()
          .indexOf(match[0].toLowerCase())
        return {
          result,
          name: pattern.name
            .replace('{occurrences}', match[1])
            .replace('{day}', VALID_DAYS[dayName2]),
          highlight: [
            {
              text: inputSentence.substring(
                startIndex2,
                startIndex2 + match[0].length,
              ),
              start: startIndex2,
              end: startIndex2 + match[0].length,
            },
          ],
          cleanedSentence: inputSentence.replace(match[0], '').trim(),
        }
    }
  }
  return {
    result: null,
    name: null,
    highlight: [],
    cleanedSentence: inputSentence,
  }
}

export const parseAssignees = (inputSentence, users) => {
  const sentence = inputSentence.toLowerCase()
  const result = []
  const highlight = []
  const matchedTexts = []

  // Check for @Anyone first (special case)
  const anyoneRegex = /@anyone(?=\s|$)/i
  const anyoneMatch = inputSentence.match(anyoneRegex)

  if (anyoneMatch) {
    const index = inputSentence.search(anyoneRegex)
    highlight.push({
      text: anyoneMatch[0],
      start: index,
      end: index + anyoneMatch[0].length,
    })
    matchedTexts.push({ pattern: '@anyone', original: anyoneMatch[0] })

    // For @Anyone, return empty result (no specific assignees)
    let cleanedSentence = inputSentence
    for (const matchedText of matchedTexts) {
      cleanedSentence = cleanedSentence.replace(
        new RegExp(
          matchedText.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'gi',
        ),
        '',
      )
    }

    return {
      result: [], // Empty assignees for @Anyone
      isAnyone: true, // Flag to indicate @Anyone was used
      highlight,
      cleanedSentence: cleanedSentence.replace(/\s+/g, ' ').trim(),
    }
  }

  // Sort users by longest displayName first to avoid partial matches
  const sortedUsers = users.sort(
    (a, b) => (b.displayName?.length || 0) - (a.displayName?.length || 0),
  )

  for (const user of sortedUsers) {
    if (!user.displayName) continue

    // Only match on display name - use word boundaries for exact matching
    const displayNamePattern = `@${user.displayName.toLowerCase()}`
    // Use word boundary or space/end to ensure exact match, not partial
    const exactMatchRegex = new RegExp(
      `@${user.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`,
      'i',
    )
    const exactMatch = inputSentence.match(exactMatchRegex)

    if (exactMatch && !result.some(r => r.userId === user.userId)) {
      result.push(user)
      const index = inputSentence.search(exactMatchRegex)

      highlight.push({
        text: exactMatch[0],
        start: index,
        end: index + exactMatch[0].length,
      })
      matchedTexts.push({
        pattern: displayNamePattern,
        original: exactMatch[0],
      })
    }
  }

  if (result.length > 0) {
    let cleanedSentence = inputSentence
    // Remove all matched assignee patterns using the original matched text
    for (const matchedText of matchedTexts) {
      cleanedSentence = cleanedSentence.replace(
        new RegExp(
          matchedText.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'gi',
        ),
        '',
      )
    }

    return {
      result,
      isAnyone: false,
      highlight,
      cleanedSentence: cleanedSentence.replace(/\s+/g, ' ').trim(),
    }
  }

  return { result: null, isAnyone: false, cleanedSentence: inputSentence }
}

export const parsePoints = inputSentence => {
  let sentence = inputSentence.toLowerCase()
  const pointsPattern = /\*(\d+)\s*(?:points?)?/gi
  const match = sentence.match(pointsPattern)

  if (!match) {
    return {
      result: null,
      highlight: [],
      cleanedSentence: inputSentence,
    }
  }

  // Extract the first points match
  const pointsMatch = match[0]
  const pointsValue = parseInt(pointsMatch.replace(/\D/g, ''), 10)
  const startIndex = inputSentence
    .toLowerCase()
    .indexOf(pointsMatch.toLowerCase())

  return {
    result: pointsValue,
    highlight: [
      {
        text: pointsMatch,
        start: startIndex,
        end: startIndex + pointsMatch.length,
      },
    ],
    cleanedSentence: inputSentence
      .replace(
        new RegExp(pointsMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        '',
      )
      .replace(/\s+/g, ' ')
      .trim(),
  }
}

export const parseDueDate = (inputSentence, chrono) => {
  // Parse the due date using chrono
  const parsedDueDate = chrono.parse(inputSentence, new Date(), {
    forwardDate: true,
  })

  if (!parsedDueDate[0] || parsedDueDate[0].index === -1) {
    return {
      result: null,
      highlight: [],
      cleanedSentence: inputSentence,
    }
  }

  const dueDateMatch = parsedDueDate[0]
  const dueDateText = dueDateMatch.text
  const dueDateStartIndex = dueDateMatch.index
  const dueDateEndIndex = dueDateStartIndex + dueDateText.length

  // Define words that might precede the due date and should be removed
  const precedingWords = [
    'starting',
    'from',
    'beginning',
    'begin',
    'commence',
    'commencing',
  ]

  // Look for preceding words before the due date
  let cleanStartIndex = dueDateStartIndex
  let highlightStartIndex = dueDateStartIndex
  let precedingWord = ''

  // Extract text before the due date to check for preceding words
  const textBeforeDueDate = inputSentence.substring(0, dueDateStartIndex).trim()

  for (const word of precedingWords) {
    // Check if the text before due date ends with this preceding word
    const wordPattern = new RegExp(`\\b${word}\\s*$`, 'i')
    const match = textBeforeDueDate.match(wordPattern)

    if (match) {
      // Found a preceding word, include it in the text to be removed
      const matchStart = textBeforeDueDate.length - match[0].length
      cleanStartIndex = matchStart
      highlightStartIndex = matchStart
      precedingWord = match[0].trim()
      break
    }
  }

  // Create the highlight text
  const fullHighlightText = precedingWord
    ? `${precedingWord} ${dueDateText}`
    : dueDateText

  // Create cleaned sentence by removing the full match (preceding word + due date)
  const textToRemove = inputSentence.substring(cleanStartIndex, dueDateEndIndex)
  const cleanedSentence = inputSentence
    .replace(textToRemove, '')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()

  return {
    result: dueDateMatch.start.date(),
    highlight: [
      {
        text: fullHighlightText,
        start: highlightStartIndex,
        end: dueDateEndIndex,
      },
    ],
    cleanedSentence: cleanedSentence,
  }
}
