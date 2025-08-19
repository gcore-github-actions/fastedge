/**
// * Secrets Base Resource
**/

interface SecretSlots {
  slot: number
  value?: string
  checksum?: string
}
interface Secret {
  id: number
  name: string
  app_count: number
  comment: string
  secret_slots: Array<SecretSlots>
}

/**
// * Secret Utiltiy Types
**/

type SecretResource = Pick<Secret, 'name' | 'comment' | 'secret_slots'>

/**
// * Fetching Single Secret
**/
type GetSecretResponse = Secret

/**
 // * List secrets
 */
interface GetSecretsQueryParams {
  app_id?: number
  secret_name?: string
}

type GetSecretsResponseItem = Pick<
  Secret,
  'id' | 'name' | 'app_count' | 'comment'
>

type GetSecretsResponse = Array<GetSecretsResponseItem>

/**
 // * Create secrets
 */

type CreateSecretResource = Omit<Secret, 'id' | 'app_count'>
type CreateSecretResponse = Secret

/**
// * Update secret
**/
type UpdateSecretResource = Omit<Secret, 'app_count'>
type UpdateSecretResponse = Secret

/**
 // * App secrets type used in the application resource.
 */

type AppSecrets = Record<
  string,
  Pick<Secret, 'id'> & Partial<Pick<Secret, 'name' | 'comment'>>
>

export type {
  AppSecrets,
  CreateSecretResponse,
  CreateSecretResource,
  GetSecretsQueryParams,
  GetSecretResponse,
  GetSecretsResponse,
  GetSecretsResponseItem,
  SecretResource,
  SecretSlots,
  UpdateSecretResource,
  UpdateSecretResponse
}
