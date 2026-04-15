import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { type TextSplitterConfig } from "./config.ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
export class DocumentProcessor {
  private pdfPath: string;
  private textSplitterConfig: TextSplitterConfig;

  constructor(pdfPath: string, textSplitterConfig: TextSplitterConfig) {
    this.pdfPath = pdfPath;
    this.textSplitterConfig = textSplitterConfig;
  }

  async loadAndSplit(): Promise<any[]> {
    const loader = new PDFLoader(this.pdfPath);
    try {
      const rawDocuments = await loader.load();
      console.log("PDF carregou essas páginas: ", rawDocuments.length);
      const splitter = new RecursiveCharacterTextSplitter(this.textSplitterConfig);
      const splitDocuments = await splitter.splitDocuments(rawDocuments);

      return splitDocuments.map((doc, index) => ({
        ...doc,
        metadata: {
            source: doc.metadata.source,
            page: index + 1
        }
      })
        
) // Retorna o conteúdo das páginas como strings
    } catch (error) {
      console.error("Erro ao carregar o PDF:", error);
      return []; // Retorna um array vazio em caso de erro
    }
  }
}