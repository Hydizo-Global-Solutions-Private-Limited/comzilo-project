export interface ShippingRatesParams {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  isCod?: boolean;
  orderValue?: number;
}

export interface CreateShipmentParams {
  orderNumber: string;
  pickupAddress: any;
  destinationAddress: any;
  packageInfo: {
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    itemsCount: number;
  };
  isCod: boolean;
  codAmount: number;
  courierName?: string;
}

export interface ShippingRatesResult {
  courierName: string;
  rate: number;
  estimatedDays: string;
  isCodSupported: boolean;
}

export interface ShipmentResult {
  success: boolean;
  awbNumber: string;
  courierName: string;
  shipmentId: string;
  status: string;
  labelUrl?: string;
}

export interface TrackingResult {
  awbNumber: string;
  status: string;
  location?: string;
  activity: string;
  updatedAt: string;
  history: Array<{
    status: string;
    location?: string;
    activity: string;
    timestamp: string;
  }>;
}

export interface IShippingProviderAdapter {
  providerCode: string;
  providerName: string;

  authenticate(config: {
    apiKey?: string;
    apiSecret?: string;
    environment?: string;
  }): Promise<boolean>;
  getRates(params: ShippingRatesParams, config: any): Promise<ShippingRatesResult[]>;
  createShipment(params: CreateShipmentParams, config: any): Promise<ShipmentResult>;
  cancelShipment(awbNumber: string, config: any): Promise<boolean>;
  generateAWB(orderNumber: string, config: any): Promise<string>;
  generateLabel(
    awbNumber: string,
    config: any
  ): Promise<{ labelUrl: string; barcode: string; qrCode: string }>;
  trackShipment(awbNumber: string, config: any): Promise<TrackingResult>;
  createPickup(
    awbNumber: string,
    pickupDate: string,
    config: any
  ): Promise<{ success: boolean; pickupToken: string }>;
  webhookHandler(
    payload: any
  ): Promise<{ eventType: string; awbNumber: string; status: string; raw: any }>;
}
