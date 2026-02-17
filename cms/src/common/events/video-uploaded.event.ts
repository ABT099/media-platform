export class VideoUploadedEvent {
  constructor(
    public readonly uploadId: string,
    public readonly fileKey: string,
    public readonly mimeType?: string,
  ) {}
}
