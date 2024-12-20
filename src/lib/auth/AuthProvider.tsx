import {
  ReactNode,
  createContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { useApiFetcher } from '@/lib/api'
import { Auth, AuthInitializeConfig, TokensData } from './types'

interface AuthContextType {
  tokens: Auth['tokens']
  currentUser: Auth['currentUser']
  saveTokens: AuthInitializeConfig['onAuthChange']
  setCurrentUser: (user: Auth['currentUser']) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps extends AuthInitializeConfig {
  children?: ReactNode

  /**
   * @see {@link AuthInitializeConfig.initialTokens}
   */
  initialTokens?: AuthInitializeConfig['initialTokens']

  /**
   * @see {@link AuthInitializeConfig.onAuthChange}
   */
  onAuthChange?: AuthInitializeConfig['onAuthChange']
}

/**
 * Initializes the auth state and exposes it to the component-tree below.
 *
 * This allow separate calls of `useAuth` to communicate among each-other and share
 * a single source of truth.
 */
function AuthProvider(props: AuthProviderProps): JSX.Element {
  const { initialTokens, onAuthChange, children } = props
  const [tokens, setTokens] = useState<Auth['tokens']>(null)
  const [currentUser, setCurrentUser] = useState<Auth['currentUser']>(undefined)
  const fetcher = useApiFetcher()

  const saveTokens = useCallback(
    (tokens: TokensData | null) => {
      setTokens(tokens)
      onAuthChange && onAuthChange(tokens)
    },
    [onAuthChange]
  )

  useEffect(() => {
    const loadInitialTokens = async () => {
      const storedTokens = await initialTokens

      if (storedTokens) {
        saveTokens(storedTokens)

        try {
          const response = await fetcher(
            'GET /v1/users/me',
            {},
            {
              headers: {
                authorization: `Bearer ${storedTokens.access}`,
              },
            }
          )

          if (response.status === 403) {
            const refreshResponse = await fetcher('POST /v3/auth/refresh', {
              data: { refreshToken: storedTokens.refresh },
            })

            if (refreshResponse.ok) {
              const {
                accessToken,
                refreshToken,
                accessTokenExpiresAt,
                refreshTokenExpiresAt,
              } = refreshResponse.data

              saveTokens({
                access: accessToken,
                accessExpiresAt: accessTokenExpiresAt,
                refresh: refreshToken,
                refreshExpiresAt: refreshTokenExpiresAt,
              })

              const userResponse = await fetcher(
                'GET /v1/users/me',
                {},
                {
                  headers: {
                    authorization: `Bearer ${accessToken}`,
                  },
                }
              )

              if (userResponse.ok) {
                const { userId, email, displayName } = userResponse.data
                setCurrentUser({ userId, email, name: displayName })
              }
            }
          }

          if (response.ok) {
            const { userId, email, displayName } = response.data
            setCurrentUser({ userId, email, name: displayName })
          }
        } catch (error) {
          console.error(error)
        }
      } else {
        setCurrentUser(null)
      }
    }

    loadInitialTokens().catch((error) => {
      console.error('Load initial tokens failed', error)
    })
  }, [fetcher, initialTokens, saveTokens])

  return (
    <AuthContext.Provider
      value={{
        tokens,
        currentUser,
        saveTokens,
        setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export { AuthProvider, type AuthProviderProps, AuthContext }
