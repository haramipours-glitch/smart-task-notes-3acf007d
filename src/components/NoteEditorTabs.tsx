import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RichEditor } from "@/components/RichEditor";
import { markdownToHtml } from "@/lib/markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Three-mode note editor: visual rich editor / raw markdown / preview.
 * Used by NotesView and inside TaskDetail.
 */
export function NoteEditorTabs({
  noteId,
  markdown,
  onChange,
}: {
  noteId: string;
  markdown: string;
  onChange: (md: string, html: string) => void;
}) {
  return (
    <Tabs defaultValue="visual" className="w-full">
      <TabsList>
        <TabsTrigger value="visual">📖 نمایش/ویرایش</TabsTrigger>
        <TabsTrigger value="markdown">📝 Markdown خام</TabsTrigger>
        <TabsTrigger value="preview">👁 پیش‌نمایش</TabsTrigger>
      </TabsList>

      <TabsContent value="visual" className="mt-3">
        <RichEditor
          key={noteId}
          initialMarkdown={markdown}
          onChange={(html, md) => onChange(md, html)}
        />
      </TabsContent>

      <TabsContent value="markdown" className="mt-3 space-y-3">
        <Textarea
          value={markdown}
          onChange={(e) => onChange(e.target.value, markdownToHtml(e.target.value))}
          className="min-h-[40vh] font-mono text-sm w-full"
          dir="ltr"
        />
        <div className="border rounded-lg p-4 bg-card/40">
          <p className="text-xs text-muted-foreground mb-2">پیش‌نمایش زنده:</p>
          <div className="prose-note max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown || ""}
            </ReactMarkdown>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="preview" className="mt-3">
        <div className="border rounded-lg p-5 bg-card/40 min-h-[50vh]">
          <div className="prose-note max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown || ""}
            </ReactMarkdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
