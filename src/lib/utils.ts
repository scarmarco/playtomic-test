import { Match, User } from '@/lib/api-types'

function printKeysAsHeaders(data: Match[]) {
  return Object.keys(data[0]).join(',')
}

function mapPlayerToKeyValueString(players: User[]) {
  return players
    .map((player) =>
      Object.entries(player)
        .map(([key, value]) => `${key}:${value}`)
        .join('|')
    )
    .join(',')
}

function valueToCSVFormat(allMatches: Match[]) {
  return allMatches
    .map((match) => {
      const { teams, ...props } = match
      const matchValues = Object.values(props).join(',')
      const teamsValues = teams
        .map(({ id, players }) => [
          `teamId: ${id}`,
          `players:, ${mapPlayerToKeyValueString(players)}`,
        ])
        .join(',')
      return `${matchValues},${teamsValues}`
    })
    .join('\n')
}

function triggerDownload(csvContent: string, name: string) {
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', name)
  link.click()
}

export { printKeysAsHeaders, valueToCSVFormat, triggerDownload }
