export const sortLabels = (labels, locale) =>
  [...labels].sort((a, b) =>
    a.name.localeCompare(b.name, locale, {
      sensitivity: 'base',
      numeric: true,
    }),
  )

const normalize = value =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim()

export const filterLabels = (labels, query) => {
  const search = normalize(query)
  return labels.filter(label => normalize(label.name).includes(search))
}
