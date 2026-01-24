import { StrategyForm } from "@/components/research/strategy-form"
import { CodeEditor } from "@/components/research/code-editor"
import { ResultsView } from "@/components/research/results-view"

export default function ResearchPage() {
  return (
    <div className="h-[calc(100vh-6rem)] p-4">
        {/* Using CSS Grid for simplicity instead of complex ResizablePanels for the prototype first pass, 
            or actually let's try to use ResizablePanels if available, but I need to check if installed.
            The package.json showed react-resizable-panels.
        */}
        <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Pane: Config */}
            <div className="col-span-3 flex flex-col gap-4">
                <StrategyForm />
            </div>

            {/* Middle/Right: Editor & Results */}
            <div className="col-span-9 flex flex-col gap-4 h-full">
                <div className="h-1/2">
                    <CodeEditor />
                </div>
                <div className="h-1/2 min-h-0">
                    <ResultsView />
                </div>
            </div>
        </div>
    </div>
  )
}
