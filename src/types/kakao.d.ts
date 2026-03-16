// 카카오맵 SDK 타입 선언
declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }
    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setLevel(level: number): void;
      getLevel(): number;
      getCenter(): LatLng;
      setBounds(bounds: LatLngBounds): void;
    }
    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }
    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
    }
    class LatLngBounds {
      constructor();
      extend(latlng: LatLng): void;
    }
    interface MapOptions {
      center: LatLng;
      level: number;
    }
    interface MarkerOptions {
      position: LatLng;
      map?: Map;
    }
    interface CustomOverlayOptions {
      position: LatLng;
      content: string | HTMLElement;
      map?: Map;
      yAnchor?: number;
      xAnchor?: number;
    }
    namespace event {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function addListener(
        target: unknown,
        type: string,
        callback: (...args: any[]) => void
      ): void;
    }
    namespace services {
      class Geocoder {
        coord2Address(
          lng: number,
          lat: number,
          callback: (result: GeocoderResult[], status: string) => void
        ): void;
        addressSearch(
          address: string,
          callback: (result: AddressSearchResult[], status: string) => void
        ): void;
      }
      interface GeocoderResult {
        road_address: {
          address_name: string;
          region_1depth_name: string;
          region_2depth_name: string;
          region_3depth_name: string;
        } | null;
        address: {
          address_name: string;
          region_1depth_name: string;
          region_2depth_name: string;
          region_3depth_name: string;
        };
      }
      interface AddressSearchResult {
        x: string;
        y: string;
        address_name: string;
        road_address?: {
          region_1depth_name: string;
          region_2depth_name: string;
        };
      }
      enum Status {
        OK = 'OK',
        ZERO_RESULT = 'ZERO_RESULT',
        ERROR = 'ERROR',
      }
    }
    function load(callback: () => void): void;
  }
}

interface Window {
  kakao: typeof kakao;
}
