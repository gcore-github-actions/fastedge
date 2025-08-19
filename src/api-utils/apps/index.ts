import qs from 'qs'

import { getBinary } from '../binaries/index.js'

import type {
  ApiConfig,
  CreateAppResource,
  EnhancedAppResponse,
  GetAppResponse,
  GetAppResponseWithBinary,
  GetAppsQueryParams,
  GetAppsResponse,
  UpdateAppResource
} from '../types.js'

const createEnhancedAppResponse = <T extends GetAppResponse>(
  apiConfig: ApiConfig,
  basePromise: Promise<T>
): EnhancedAppResponse<T> => {
  return Object.assign(basePromise, {
    includeBinary: (): EnhancedAppResponse<
      GetAppResponseWithBinary | GetAppResponse
    > => {
      const binaryPromise = basePromise.then(async (app: T) => {
        if (app.binary && typeof app.binary === 'number') {
          const binaryData = await getBinary(apiConfig, app.binary)
          return { ...app, binary: binaryData }
        }
        return { ...app }
      })
      return createEnhancedAppResponse(
        apiConfig,
        binaryPromise
      ) as EnhancedAppResponse<GetAppResponseWithBinary | GetAppResponse>
    }

    //   includeTemplate: (): EnhancedAppResponse<GetAppResponseComplete> => {
    //     const templatePromise = basePromise.then(async (app: any) => {
    //       if (app.template) {
    //         const templateData = await templates.getTemplate(
    //           this.apiConfig,
    //           app.template
    //         )
    //         return { ...app, template: templateData }
    //       }
    //       return { ...app }
    //     })
    //     return createEnhancedResponse(templatePromise)
    //   }
  }) as EnhancedAppResponse<T>
}

function appendAppIncludes<T extends GetAppResponse>(
  apiConfig: ApiConfig,
  getAppFn: () => Promise<T>
): EnhancedAppResponse<T> {
  return createEnhancedAppResponse(apiConfig, getAppFn())
}

async function getApp(
  apiConfig: ApiConfig,
  id: string | number
): Promise<GetAppResponse> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/apps/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`
      }
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const app = (await response.json()) as GetAppResponse
    return {
      ...app,
      id: Number.parseInt(id.toString(), 10) // Ensure ID is included as a number
    }
  } catch (error) {
    throw new Error(
      `Error fetching application: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getApps(
  apiConfig: ApiConfig,
  query: GetAppsQueryParams
): Promise<GetAppsResponse> {
  try {
    const queryString = qs.stringify(query, {
      skipNulls: true,
      addQueryPrefix: true
    })
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/apps${queryString}`,
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
      'apps',
      GetAppsResponse
    >
    return jsonResponse.apps ?? []
  } catch (error) {
    throw new Error(
      `Error fetching applications: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getAppByName(
  apiConfig: ApiConfig,
  name: string
): Promise<GetAppResponse> {
  const apps = await getApps(apiConfig, { name })
  if (apps.length === 0) {
    throw new Error(`Application with name "${name}" not found`)
  }
  return getApp(apiConfig, apps[0].id)
}

async function createApp(
  apiConfig: ApiConfig,
  app: CreateAppResource
): Promise<GetAppResponse> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/apps`, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(app)
    })
    if (!response.ok) {
      // ? FIX: Figure out better error handling
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppResponse>
  } catch (error) {
    throw new Error(
      `Error creating application: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function updateApp(
  apiConfig: ApiConfig,
  app: UpdateAppResource
): Promise<GetAppResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/apps/${app.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(app)
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<GetAppResponse>
  } catch (error) {
    throw new Error(
      `Error updating application: ${error instanceof Error ? error.message : error}`
    )
  }
}

export {
  appendAppIncludes,
  createApp,
  getApp,
  getAppByName,
  getApps,
  updateApp
}
