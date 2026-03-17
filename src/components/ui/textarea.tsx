// 파일 역할:
// - shadcn/ui 기반 공용 UI 프리미티브 파일이다.
// 사용 위치:
// - 여러 도메인 컴포넌트가 공통 스타일과 접근성 규칙을 맞추기 위해 재사용한다;
// 흐름:
// - 상위 페이지/섹션 컴포넌트가 데이터를 내려주면, 이 파일이 상태와 이벤트를 정리해 하위 UI 프리미티브에 전달한다;
import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
