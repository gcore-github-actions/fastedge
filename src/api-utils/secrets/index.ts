import qs from 'qs'

import type {
  ApiConfig,
  CreateSecretResource,
  CreateSecretResponse,
  GetSecretResponse,
  GetSecretsQueryParams,
  GetSecretsResponse,
  UpdateSecretResource,
  UpdateSecretResponse
} from '../types.js'

async function getSecret(
  apiConfig: ApiConfig,
  id: string | number
): Promise<GetSecretResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/secrets/${id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`
        }
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const secret = (await response.json()) as GetSecretResponse
    return {
      ...secret,
      id: Number.parseInt(id.toString(), 10) // Ensure ID is a number
    }
  } catch (error) {
    throw new Error(
      `Error fetching secret: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getSecrets(
  apiConfig: ApiConfig,
  query: GetSecretsQueryParams
): Promise<GetSecretsResponse> {
  try {
    const queryString = qs.stringify(query, {
      skipNulls: true,
      addQueryPrefix: true
    })
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/secrets${queryString}`,
      {
        method: 'GET',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`
        }
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const jsonResponse = (await response.json()) as Record<
      'secrets',
      GetSecretsResponse
    >
    return jsonResponse.secrets ?? []
  } catch (error) {
    throw new Error(
      `Error fetching secrets: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getSecretByName(
  apiConfig: ApiConfig,
  name: string
): Promise<GetSecretResponse> {
  const secrets = await getSecrets(apiConfig, { secret_name: name })
  if (secrets.length === 0) {
    throw new Error(`Secret with name "${name}" not found`)
  }
  return getSecret(apiConfig, secrets[0].id)
}

async function createSecret(
  apiConfig: ApiConfig,
  secret: CreateSecretResource
): Promise<CreateSecretResponse> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/secrets`, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(secret)
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<CreateSecretResponse>
  } catch (error) {
    throw new Error(
      `Error creating secret: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function updateSecret(
  apiConfig: ApiConfig,
  secret: UpdateSecretResource
): Promise<UpdateSecretResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/secrets/${secret.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(secret)
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const updateRes = (await response.json()) as UpdateSecretResponse
    return {
      ...updateRes,
      id: Number.parseInt(secret.id.toString(), 10) // Ensure ID is included and a number
    }
  } catch (error) {
    throw new Error(
      `Error updating secret: ${error instanceof Error ? error.message : error}`
    )
  }
}

export { createSecret, getSecret, getSecretByName, getSecrets, updateSecret }
