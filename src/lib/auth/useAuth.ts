import { useContext } from 'react'
import { useApiFetcher } from '@/lib/api'
import { Auth } from './types'
import { AuthContext } from './AuthProvider'

/**
 * Returns the current auth state. See {@link Auth} for more information on
 * what is included there.
 *
 * @throws {TypeError} if called from a component not descendant of AuthProvider
 */
function useAuth(): Auth {
  const fetcher = useApiFetcher()
  const authContext = useContext(AuthContext)

  if (!authContext) {
    throw new TypeError('useAuth must be used within a AuthProvider')
  }

  const { tokens, currentUser, saveTokens, setCurrentUser } = authContext

  return {
    tokens,
    currentUser,
    async login(credentials) {
      const { email, password } = credentials

      try {
        const authResponse = await fetcher('POST /v3/auth/login', {
          data: { email, password },
        })

        if (!authResponse.ok) {
          return Promise.reject(new Error(authResponse.data.message))
        }

        saveTokens?.({
          access: authResponse.data.accessToken,
          accessExpiresAt: authResponse.data.accessTokenExpiresAt,
          refresh: authResponse.data.refreshToken,
          refreshExpiresAt: authResponse.data.refreshTokenExpiresAt,
        })

        const userResponse = await fetcher(
          'GET /v1/users/me',
          {},
          {
            headers: {
              authorization: `Bearer ${authResponse.data.accessToken}`,
            },
          }
        )

        if (userResponse.ok) {
          const { userId, email: userEmail, displayName } = userResponse.data
          setCurrentUser({ userId, email: userEmail, name: displayName })
        }
      } catch (error) {
        return Promise.reject(new Error(error as string))
      }
    },
    logout() {
      saveTokens?.(null)
      setCurrentUser(null)
      return Promise.resolve()
    },
  }
}

export { useAuth }
