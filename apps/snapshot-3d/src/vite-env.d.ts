/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `0` hides the photo-viewpoint selector in builds that cannot ship the reference photographs. */
  readonly VITE_PHOTO_REVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
