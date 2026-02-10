'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface MatrixMarket {
  id: string
  name: string
}

export interface MatrixTemplate {
  id: string
  name: string
}

export interface MatrixScore {
  percentage: number
  totalMandatory: number
  doneMandatory: number
  isDeployed: boolean
}

// Map<marketId, Record<templateId, MatrixScore>>
export type MatrixData = Record<string, Record<string, MatrixScore>>

interface DensityMatrixProps {
  markets: MatrixMarket[]
  templates: MatrixTemplate[]
  data: MatrixData
}

export function DensityMatrix({ markets, templates, data }: DensityMatrixProps) {
  return (
    <div className="w-full space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium sticky left-0 bg-background z-10 border-r">
                Market
              </th>
              {templates.map((template) => (
                <th key={template.id} scope="col" className="px-4 py-3 font-medium text-center border-l min-w-[120px]">
                  {template.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {markets.map((market) => (
              <tr key={market.id} className="bg-background hover:bg-muted/50 transition-colors">
                <th scope="row" className="px-4 py-3 font-medium text-foreground whitespace-nowrap sticky left-0 bg-background z-10 border-r group-hover:bg-muted/50">
                  <Link href={`/app/${market.id}/board`} className="hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
                    {market.name}
                  </Link>
                </th>
                {templates.map((template) => {
                  const score = data[market.id]?.[template.id]
                  return (
                    <td key={template.id} className="px-4 py-3 text-center border-l p-0 h-full">
                      <ScoreCell score={score} marketId={market.id} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-2">
        {markets.map((market) => (
          <MobileMarketCard
            key={market.id}
            market={market}
            templates={templates}
            scores={data[market.id] || {}}
          />
        ))}
      </div>
    </div>
  )
}

function ScoreCell({ score, marketId }: { score?: MatrixScore; marketId: string }) {
  if (!score || !score.isDeployed) {
    return <span className="text-muted-foreground/30 select-none">-</span>
  }

  const { percentage } = score
  let colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  if (percentage === 100) {
    colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  } else if (percentage >= 80) {
    colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
  }

  return (
    <Link href={`/app/${marketId}/board`} className="flex items-center justify-center w-full h-full min-h-[40px] hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring inset-0">
      <div className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold', colorClass)}>
        {percentage}%
      </div>
    </Link>
  )
}

function MobileMarketCard({
  market,
  templates,
  scores,
}: {
  market: MatrixMarket
  templates: MatrixTemplate[]
  scores: Record<string, MatrixScore>
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const activeScores = templates.filter(t => scores[t.id]?.isDeployed)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between p-4">
        <Link href={`/app/${market.id}/board`} className="font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded-sm">
          {market.name}
        </Link>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="sr-only">Toggle details</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="px-4 pb-4 pt-0 space-y-2 border-t mt-2 pt-4">
        {activeScores.length > 0 ? (
          activeScores.map((template) => {
            const score = scores[template.id]
            return (
              <div key={template.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{template.name}</span>
                <div className="w-16 flex justify-end">
                   <ScoreCell score={score} marketId={market.id} />
                </div>
              </div>
            )
          })
        ) : (
          <p className="text-xs text-muted-foreground italic">No templates assigned.</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
