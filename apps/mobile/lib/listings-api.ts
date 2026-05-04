import type {
  ConnectObdDeviceRequest,
  CreateObdReportRequest,
  CreateGarageVehicleRequest,
  CreateListingRequest,
  GarageVehicleDetailResponse,
  GarageVehicleResponse,
  GarageVehiclesResponse,
  ListingDetailResponse,
  ListingFeedCountResponse,
  ListingFeedQuery,
  ListingFeedResponse,
  ListingMutationResponse,
  ListingSaveResponse,
  ObdConnectionResponse,
  PublicGarageResponse,
  UpdateGarageVehicleRequest,
  CreateObdReportResponse,
  VehicleCatalogBrand,
  VehicleCatalogEquipmentResponse,
  VehicleCatalogType,
  VehicleCatalogTypeItem,
  VehicleCatalogModel,
  VehicleCatalogPackage,
  VehicleCatalogSpecsResponse,
  VehiclePackageSpec,
} from '@carloi-v4/types';

import { MOBILE_API_BASE_URL } from './api-base-url';

const API_BASE_URL = MOBILE_API_BASE_URL;

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
      'x-device-name': 'carloi-mobile',
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
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        search.set(key, value.join(','));
      }

      continue;
    }

    if (typeof value === 'boolean') {
      search.set(key, value ? 'true' : 'false');
      continue;
    }

    search.set(key, String(value));
  }

  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export const mobileListingsApi = {
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
  getCount(accessToken: string, query?: ListingFeedQuery) {
    return requestJson<ListingFeedCountResponse>(`/listings/count${buildListingFeedQuery(query)}`, {
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
  getCatalogTypes() {
    return requestJson<VehicleCatalogTypeItem[]>('/vehicle-catalog/types');
  },
  getBrands(type?: VehicleCatalogType) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return requestJson<VehicleCatalogBrand[]>(`/vehicle-catalog/brands${query}`);
  },
  getModels(brandId: string, type?: VehicleCatalogType) {
    const search = new URLSearchParams({ brandId });
    if (type) {
      search.set('type', type);
    }
    return requestJson<VehicleCatalogModel[]>(`/vehicle-catalog/models?${search.toString()}`);
  },
  getPackages(modelId: string) {
    return requestJson<VehicleCatalogPackage[]>(`/vehicle-catalog/packages?modelId=${encodeURIComponent(modelId)}`);
  },
  getPackageSpecs(packageId: string, year?: number) {
    const search = new URLSearchParams({ packageId });
    if (year) {
      search.set('year', String(year));
    }
    return requestJson<VehicleCatalogSpecsResponse>(`/vehicle-catalog/specs?${search.toString()}`);
  },
  getPackageEquipment(packageId: string) {
    return requestJson<VehicleCatalogEquipmentResponse>(
      `/vehicle-catalog/equipment?packageId=${encodeURIComponent(packageId)}`,
    );
  },
  getPackageSpec(packageId: string) {
    return requestJson<VehiclePackageSpec>(`/vehicle-catalog/packages/${packageId}/spec`);
  },
};

