import qs from 'qs'

import type {
  ApiConfig,
  CreateTemplateResource,
  GetTemplateResponse,
  GetTemplatesQueryParams,
  GetTemplatesResponse,
  TemplateShort,
  UpdateTemplateResource
} from '../types.js'

async function getTemplate(
  apiConfig: ApiConfig,
  id: string | number
): Promise<GetTemplateResponse> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/template/${id}`,
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
    const template = (await response.json()) as GetTemplateResponse
    return {
      ...template,
      id: Number.parseInt(id.toString(), 10) // Ensure ID is included as a number
    }
  } catch (error) {
    throw new Error(
      `Error fetching template: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function getTemplates(
  apiConfig: ApiConfig,
  query: GetTemplatesQueryParams = {}
): Promise<GetTemplatesResponse> {
  try {
    const queryString = qs.stringify(query, {
      skipNulls: true,
      addQueryPrefix: true
    })
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/template${queryString}`,
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
      'templates',
      GetTemplatesResponse
    >
    return jsonResponse.templates ?? []
  } catch (error) {
    throw new Error(
      `Error fetching templates: ${error instanceof Error ? error.message : error}`
    )
  }
}

// Template list API has no name filter — scan owned templates (max 200)
async function getTemplateByName(
  apiConfig: ApiConfig,
  name: string
): Promise<GetTemplateResponse> {
  const templates = await getTemplates(apiConfig, {
    only_mine: true,
    limit: 200
  })
  const match = templates.find((t: TemplateShort) => t.name === name)
  if (!match) {
    throw new Error(`Template with name "${name}" not found`)
  }
  return getTemplate(apiConfig, match.id)
}

async function createTemplate(
  apiConfig: ApiConfig,
  template: CreateTemplateResource
): Promise<TemplateShort> {
  try {
    const response = await fetch(`${apiConfig.apiUrl}/fastedge/v1/template`, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(template)
    })
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    return response.json() as Promise<TemplateShort>
  } catch (error) {
    throw new Error(
      `Error creating template: ${error instanceof Error ? error.message : error}`
    )
  }
}

async function updateTemplate(
  apiConfig: ApiConfig,
  template: UpdateTemplateResource
): Promise<TemplateShort> {
  try {
    const response = await fetch(
      `${apiConfig.apiUrl}/fastedge/v1/template/${template.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `APIKey ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      }
    )
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    const updated = (await response.json()) as TemplateShort
    return {
      ...updated,
      id: Number.parseInt(template.id.toString(), 10) // Ensure ID is always a number
    }
  } catch (error) {
    throw new Error(
      `Error updating template: ${error instanceof Error ? error.message : error}`
    )
  }
}

export {
  createTemplate,
  getTemplate,
  getTemplateByName,
  getTemplates,
  updateTemplate
}
