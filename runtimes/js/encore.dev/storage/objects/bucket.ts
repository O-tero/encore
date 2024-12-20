import { getCurrentRequest } from "../../internal/reqtrack/mod";
import * as runtime from "../../internal/runtime/mod";
import { StringLiteral } from "../../internal/utils/constraints";
import { unwrapErr } from "./error";
import { BucketPerms, Uploader, Downloader, Attrser, Lister, Remover } from "./refs";

export interface BucketConfig {
  /**
   * Whether to enable versioning of the objects in the bucket.
   * Defaults to false if unset.
   */
  versioned?: boolean;
}

/**
 * Defines a new Object Storage bucket infrastructure resource.
 */
export class Bucket extends BucketPerms implements Uploader, Downloader, Attrser, Lister, Remover {
  impl: runtime.Bucket;

  /**
   * Creates a new bucket with the given name and configuration
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(name: string, cfg?: BucketConfig) {
    super();
    this.impl = runtime.RT.bucket(name);
  }

  /**
   * Reference an existing bucket by name.
   * To create a new storage bucket, use `new StorageBucket(...)` instead.
   */
  static named<name extends string>(name: StringLiteral<name>): Bucket {
    return new Bucket(name, {});
  }

  async *list(options: ListOptions): AsyncGenerator<ListEntry> {
    const source = getCurrentRequest();
    const iter = unwrapErr(await this.impl.list(options, source));
    while (true) {
      const entry = await iter.next();
      if (entry === null) {
        iter.markDone();
        break;
      }
      yield entry;
    }
  }

  /**
   * Returns whether the object exists in the bucket.
   * Throws an error on network failure.
   */
  async exists(name: string, options?: ExistsOptions): Promise<boolean> {
    const source = getCurrentRequest();
    const impl = this.impl.object(name);
    const res = await impl.exists(options, source);
    return unwrapErr(res);
  }

  /**
   * Returns the object's attributes.
   * Throws an error if the object does not exist.
   */
  async attrs(name: string, options?: AttrsOptions): Promise<ObjectAttrs> {
    const source = getCurrentRequest();
    const impl = this.impl.object(name);
    const res = await impl.attrs(options, source);
    return unwrapErr(res);
  }

  /**
   * Uploads an object to the bucket.
   */
  async upload(name: string, data: Buffer, options?: UploadOptions): Promise<ObjectAttrs> {
    const source = getCurrentRequest();
    const impl = this.impl.object(name);
    const res = await impl.upload(data, options, source);
    return unwrapErr(res);
  }

  /**
   * Downloads an object from the bucket and returns its contents.
   */
  async download(name: string, options?: DownloadOptions): Promise<Buffer> {
    const source = getCurrentRequest();
    const impl = this.impl.object(name);
    const res = await impl.downloadAll(options, source);
    return unwrapErr(res);
  }

  /**
   * Removes an object from the bucket.
   * Throws an error on network failure.
   */
  async remove(name: string, options?: DeleteOptions): Promise<void> {
    const source = getCurrentRequest();
    const impl = this.impl.object(name);
    const err = await impl.delete(options, source);
    if (err) {
      unwrapErr(err);
    }
  }

  ref<P extends BucketPerms>(): P {
    return this as unknown as P
  }
}

export interface ListOptions {
  /**
   * Only include objects with this prefix in the listing.
   * If unset, all objects are included.
  */
  prefix?: string;

  /** Maximum number of objects to return. Defaults to no limit. */
  limit?: number;
}

export interface AttrsOptions {
  /**
   * The object version to retrieve attributes for.
   * Defaults to the lastest version if unset.
   *
   * If bucket versioning is not enabled, this option is ignored.
   */
  version?: string;
}

export interface ExistsOptions {
  /**
   * The object version to check for existence.
   * Defaults to the lastest version if unset.
   *
   * If bucket versioning is not enabled, this option is ignored.
   */
  version?: string;
}

export interface DeleteOptions {
  /**
   * The object version to delete.
   * Defaults to the lastest version if unset.
   *
   * If bucket versioning is not enabled, this option is ignored.
   */
  version?: string;
}

export interface DownloadOptions {
  /**
   * The object version to download.
   * Defaults to the lastest version if unset.
   *
   * If bucket versioning is not enabled, this option is ignored.
   */
  version?: string;
}

export interface ObjectAttrs {
  name: string;
  size: number;
  /** The version of the object, if bucket versioning is enabled. */
  version?: string;
  etag: string;
  contentType?: string;
}

export interface ListEntry {
  name: string;
  size: number;
  etag: string;
}

export interface UploadOptions {
  contentType?: string;
  preconditions?: {
    notExists?: boolean;
  },
}
