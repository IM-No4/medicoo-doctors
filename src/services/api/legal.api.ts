import { apiClient } from './client';

export type LegalDocumentType = 'terms' | 'privacy' | 'security' | 'community-guidelines';

export interface LegalSectionDto {
  heading?: string;
  body: string;
}

export interface LegalDocumentDto {
  title: string;
  sections: LegalSectionDto[];
  updatedAt: string;
}

export interface LegalAcceptanceStatus {
  required: boolean;
  latestUpdatedAt?: string;
}

// Public - no auth required, reachable pre-login from LoginScreen's links.
export const getLegalDocument = async (type: LegalDocumentType): Promise<LegalDocumentDto> => {
  const response = await apiClient.get(`/api/v1/legal/${type}`);
  return response.data;
};

export const getLegalAcceptanceStatus = async (): Promise<LegalAcceptanceStatus> => {
  const response = await apiClient.get('/api/v1/legal/acceptance-status');
  return response.data;
};

export const acceptLegalDocuments = async (): Promise<void> => {
  await apiClient.post('/api/v1/legal/accept');
};
