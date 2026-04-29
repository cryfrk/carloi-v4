import type {
  ConnectObdDeviceRequest,
  CreateObdReportRequest,
  CreateGarageVehicleRequest,
  CreateListingRequest,
  GarageVehicleDetailResponse,
  GarageVehicleResponse,
  GarageVehiclesResponse,
  ListingDetailResponse,
  ListingFeedQuery,
  ListingFeedResponse,
  ListingMutationResponse,
  ListingSaveResponse,
  ObdConnectionResponse,
  PublicGarageResponse,
  UpdateGarageVehicleRequest,
  CreateObdReportResponse,
  VehicleCatalogBrand,
  VehicleCatalogModel,
  VehicleCatalogPackage,
  VehiclePackageSpec,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class ListingsApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  accessToken?: string;
  body?: object;
};

async function requestJson<TResponse>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.accessToken ? { authorization: `Bearer ${options.accessToken}` } : {}),
      'x-device-name': 'carloi-web',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new ListingsApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

function buildListingFeedQuery(query: ListingFeedQuery = {}) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }

  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export const webListingsApi = {
  getGarageVehicles(accessToken: string) {
    return requestJson<GarageVehiclesResponse>('/garage/vehicles', { accessToken });
  },
  createGarageVehicle(accessToken: string, body: CreateGarageVehicleRequest) {
    return requestJson<GarageVehicleResponse>('/garage/vehicles', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getGarageVehicleDetail(accessToken: string, vehicleId: string) {
    return requestJson<GarageVehicleDetailResponse>(`/garage/vehicles/${vehicleId}`, { accessToken });
  },
  updateGarageVehicle(accessToken: string, vehicleId: string, body: UpdateGarageVehicleRequest) {
    return requestJson<GarageVehicleResponse>(`/garage/vehicles/${vehicleId}`, {
      method: 'PATCH',
      accessToken,
      body,
    });
  },
  deleteGarageVehicle(accessToken: string, vehicleId: string) {
    return requestJson<{ success: true }>(`/garage/vehicles/${vehicleId}`, {
      method: 'DELETE',
      accessToken,
    });
  },
  connectObdDevice(accessToken: string, vehicleId: string, body: ConnectObdDeviceRequest) {
    return requestJson<ObdConnectionResponse>(`/garage/vehicles/${vehicleId}/obd/connect`, {
      method: 'POST',
      accessToken,
      body,
    });
  },
  createObdReport(accessToken: string, vehicleId: string, body: CreateObdReportRequest) {
    return requestJson<CreateObdReportResponse>(`/garage/vehicles/${vehicleId}/obd/report`, {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getPublicGarage(userId: string) {
    return requestJson<PublicGarageResponse>(`/users/${userId}/public-garage`);
  },
  createListing(accessToken: string, body: CreateListingRequest) {
    return requestJson<ListingMutationResponse>('/listings', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getFeed(accessToken: string, query?: ListingFeedQuery) {
    return requestJson<ListingFeedResponse>(`/listings/feed${buildListingFeedQuery(query)}`, {
      accessToken,
    });
  },
  getDetail(accessToken: string, listingId: string) {
    return requestJson<ListingDetailResponse>(`/listings/${listingId}`, { accessToken });
  },
  saveListing(accessToken: string, listingId: string) {
    return requestJson<ListingSaveResponse>(`/listings/${listingId}/save`, {
      method: 'POST',
      accessToken,
    });
  },
  unsaveListing(accessToken: string, listingId: string) {
    return requestJson<ListingSaveResponse>(`/listings/${listingId}/save`, {
      method: 'DELETE',
      accessToken,
    });
  },
  getBrands() {
    return requestJson<VehicleCatalogBrand[]>('/vehicle-catalog/brands');
  },
  getModels(brandId: string) {
    return requestJson<VehicleCatalogModel[]>(`/vehicle-catalog/brands/${brandId}/models`);
  },
  getPackages(modelId: string) {
    return requestJson<VehicleCatalogPackage[]>(`/vehicle-catalog/models/${modelId}/packages`);
  },
  getPackageSpec(packageId: string) {
    return requestJson<VehiclePackageSpec>(`/vehicle-catalog/packages/${packageId}/spec`);
  },
};
