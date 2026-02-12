import { beforeEach, describe, expect, test, vi } from "vitest";

const reactPdfMocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
}));

const mammothMocks = vi.hoisted(() => ({
  convertToHtml: vi.fn(),
}));

const html2canvasMock = vi.hoisted(() => vi.fn());
const jsPdfConstructorMock = vi.hoisted(() => vi.fn());

vi.mock("react-pdf", () => ({
  pdfjs: {
    version: "test",
    GlobalWorkerOptions: {
      workerSrc: "",
    },
    getDocument: reactPdfMocks.getDocument,
  },
}));

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: mammothMocks.convertToHtml,
  },
}));

vi.mock("html2canvas", () => ({
  default: html2canvasMock,
}));

vi.mock("jspdf", () => ({
  jsPDF: jsPdfConstructorMock,
}));

import { generateThumbnail } from "@/features/bookmarks/utils/thumbnail-generator";

const createFile = (name: string, type: string) => {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "arrayBuffer", {
    value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    configurable: true,
  });
  return file;
};

describe("thumbnail generator dispatch", () => {
  beforeEach(() => {
    if (!File.prototype.arrayBuffer) {
      Object.defineProperty(File.prototype, "arrayBuffer", {
        value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        configurable: true,
      });
    }

    const gradient = {
      addColorStop: vi.fn(),
    };

    const context2d = {
      drawImage: vi.fn(),
      fillStyle: "",
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => gradient),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      font: "",
      textAlign: "left" as CanvasTextAlign,
      textBaseline: "alphabetic" as CanvasTextBaseline,
      measureText: vi.fn((value: string) => ({ width: value.length * 8 })),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context2d);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback?.(new Blob(["thumb"], { type: "image/jpeg" }));
    });

    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      writable: true,
      value: class MockImage {
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        public width = 1200;
        public height = 800;

        set src(_value: string) {
          queueMicrotask(() => {
            this.onload?.();
          });
        }
      },
    });

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      ((tagName: string, options?: ElementCreationOptions) => {
        if (tagName.toLowerCase() === "video") {
          const video = {
            onloadedmetadata: null as (() => void) | null,
            onseeked: null as (() => void) | null,
            onerror: null as (() => void) | null,
            duration: 10,
            videoWidth: 1280,
            videoHeight: 720,
            currentTime: 0,
            load() {
              this.onloadedmetadata?.();
              this.onseeked?.();
            },
            set src(_value: string) {},
          };
          return video as unknown as HTMLElement;
        }

        return originalCreateElement(tagName, options);
      }) as typeof document.createElement,
    );

    reactPdfMocks.getDocument.mockReturnValue({
      promise: Promise.resolve({
        getPage: vi.fn().mockResolvedValue({
          getViewport: vi.fn().mockReturnValue({ width: 1200, height: 800 }),
          render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
        }),
      }),
    });

    mammothMocks.convertToHtml.mockResolvedValue({
      value: "<p>Generated DOCX content</p>",
    });

    html2canvasMock.mockResolvedValue({
      width: 1200,
      height: 1600,
      toDataURL: vi.fn(() => "data:image/jpeg;base64,AAAA"),
    });

    jsPdfConstructorMock.mockImplementation(() => ({
      internal: {
        pageSize: {
          getWidth: () => 595,
        },
      },
      addImage: vi.fn(),
      output: vi.fn(() => new Blob(["pdf"], { type: "application/pdf" })),
    }));
  });

  test("generateThumbnail handles images", async () => {
    const file = createFile("photo.png", "image/png");
    const result = await generateThumbnail(file);

    expect(result).toBeInstanceOf(Blob);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  test("generateThumbnail handles pdf files", async () => {
    const file = createFile("doc.pdf", "application/pdf");
    const result = await generateThumbnail(file);

    expect(result).toBeInstanceOf(Blob);
    expect(reactPdfMocks.getDocument).toHaveBeenCalledTimes(1);
  });

  test("generateThumbnail handles video files", async () => {
    const file = createFile("clip.mp4", "video/mp4");
    const result = await generateThumbnail(file);

    expect(result).toBeInstanceOf(Blob);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  test("generateThumbnail handles docx files by extension", async () => {
    const file = createFile("report.docx", "application/octet-stream");
    const result = await generateThumbnail(file);

    expect(result).toBeInstanceOf(Blob);
    expect(mammothMocks.convertToHtml).toHaveBeenCalled();
    expect(html2canvasMock).toHaveBeenCalled();
    expect(jsPdfConstructorMock).toHaveBeenCalled();
  });

  test("generateThumbnail falls back to generic documents", async () => {
    const file = createFile("sheet.csv", "text/csv");
    const result = await generateThumbnail(file);

    expect(result).toBeInstanceOf(Blob);
    expect(reactPdfMocks.getDocument).not.toHaveBeenCalled();
    expect(mammothMocks.convertToHtml).not.toHaveBeenCalled();
  });
});
