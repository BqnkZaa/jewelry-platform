'use client'

import { cn } from '@/lib/utils'
import { PRODUCTION_STEPS, ProductionStep } from '@/lib/types'
import { getStepColor } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface StepData {
    step: ProductionStep
    count: number
}

interface ProductionFlowProps {
    stepCounts?: StepData[]
    onStepClick?: (step: ProductionStep) => void
    className?: string
}

export function ProductionFlow({
    stepCounts = [],
    onStepClick,
    className,
}: ProductionFlowProps) {
    const getStepCount = (step: ProductionStep): number => {
        return stepCounts.find((s) => s.step === step)?.count || 0
    }

    return (
        <div className={cn('bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6', className)}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                สถานะการผลิต
            </h3>

            {/* Desktop view - horizontal flow */}
            <div className="hidden lg:flex items-center gap-2 overflow-x-auto pb-4">
                {PRODUCTION_STEPS.map((step, index) => (
                    <div key={step.key} className="flex items-center">
                        <button
                            onClick={() => onStepClick?.(step.key)}
                            className={cn(
                                'flex flex-col items-center min-w-[100px] p-4 rounded-xl transition-all duration-200',
                                'hover:scale-105 hover:shadow-lg',
                                'border-2',
                                getStepCount(step.key) > 0
                                    ? `${getStepColor(step.key)} border-transparent text-white`
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            )}
                        >
                            <span className="text-2xl font-bold">
                                {getStepCount(step.key)}
                            </span>
                            <span className={cn(
                                'text-xs font-medium mt-1 text-center',
                                getStepCount(step.key) > 0 ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                            )}>
                                {step.labelTh}
                            </span>
                        </button>

                        {index < PRODUCTION_STEPS.length - 1 && (
                            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-1 flex-shrink-0" />
                        )}
                    </div>
                ))}
            </div>

            {/* Mobile/Tablet view - grid */}
            <div className="lg:hidden grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRODUCTION_STEPS.map((step) => (
                    <button
                        key={step.key}
                        onClick={() => onStepClick?.(step.key)}
                        className={cn(
                            'flex flex-col items-center p-4 rounded-xl transition-all duration-200',
                            'hover:scale-105 hover:shadow-lg',
                            'border-2',
                            getStepCount(step.key) > 0
                                ? `${getStepColor(step.key)} border-transparent text-white`
                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                        )}
                    >
                        <span className="text-xl font-bold">
                            {getStepCount(step.key)}
                        </span>
                        <span className={cn(
                            'text-xs font-medium mt-1',
                            getStepCount(step.key) > 0 ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'
                        )}>
                            {step.labelTh}
                        </span>
                        <span className={cn(
                            'text-[10px] mt-0.5',
                            getStepCount(step.key) > 0 ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'
                        )}>
                            ({step.order}/10)
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
