/**
 * ArchiaMockClient
 * 
 * Mock implementation of Archia API client.
 * Returns hard-coded responses for development and testing.
 * In Phase 2, these will be replaced with real HTTP calls to Archia.
 */

import {
  AgentContext,
  AgentResponse,
  ArchiaAgentRequest,
  ArchiaAgentResponse,
  ArchiaQueryRequest,
  ArchiaQueryResponse,
} from './types';

/**
 * Simulate network delay for realistic mock behavior
 */
const mockDelay = (ms: number = 800) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock client for Archia API
 */
export class ArchiaMockClient {
  /**
   * Analyze ingestion errors
   * 
   * @param context - Context about the ingestion step and errors
   * @returns Mock agent response with suggestions
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/agent
   */
  async analyzeIngestionErrors(context: AgentContext): Promise<AgentResponse> {
    await mockDelay(1000);

    // Mock response based on docs/pipeline-specs/step01-ingestion.md
    return {
      rootCause: "Several rows have data quality issues including out-of-range ages and invalid sex codes. This is likely due to upstream data entry errors or format mismatches.",
      
      suggestions: [
        {
          id: "ing-1",
          type: "fix",
          priority: "high",
          title: "Fix Invalid Age Values",
          description: "Ages outside 0-110 range detected. Consider clamping to valid range or marking as missing.",
          actions: [
            "Review rows with age > 110 and determine if they're data entry errors",
            "Apply age validation rules: clamp to 110 or set to null",
            "Update upstream data validation to prevent future occurrences"
          ],
          confidence: 0.85
        },
        {
          id: "ing-2",
          type: "fix",
          priority: "medium",
          title: "Standardize Sex Codes",
          description: "Non-standard sex codes detected (e.g., 'X'). Map to standard values.",
          actions: [
            "Map 'X' and other variants to 'Other'",
            "Establish clear sex code standards: M, F, Other",
            "Update data dictionary documentation"
          ],
          confidence: 0.92
        },
        {
          id: "ing-3",
          type: "info",
          priority: "low",
          title: "Consider Schema Validation",
          description: "Implement schema validation before ingestion to catch issues earlier.",
          actions: [
            "Create JSON schema for expected CSV structure",
            "Add pre-ingestion validation step",
            "Generate validation reports for data providers"
          ],
          confidence: 0.78
        }
      ],
      
      patches: [
        {
          recordId: "P003",
          rowIndex: 3,
          field: "Age",
          originalValue: "999",
          suggestedValue: "110",
          reason: "Age clamped to maximum valid value",
          confidence: 0.75
        },
        {
          recordId: "P005",
          rowIndex: 5,
          field: "Sex",
          originalValue: "X",
          suggestedValue: "Other",
          reason: "Mapped non-standard sex code to 'Other'",
          confidence: 0.90
        }
      ],
      
      narrative: `I analyzed ${context.errorRecords} records with ingestion errors out of ${context.totalRecords} total records. 
      
The main issues identified are:
1. Invalid age values (e.g., 999) that exceed biological plausibility
2. Non-standard sex codes that don't match expected values (M, F, Other)

For age issues, I recommend clamping values to the 0-110 range based on CDC guidelines for human lifespan.
For sex codes, mapping non-standard values to 'Other' maintains data integrity while standardizing the format.

These fixes would resolve approximately 80% of the current ingestion errors.`,
      
      confidence: 0.82,
      
      limitations: [
        "Age imputation is based on simple clamping; clinical context may require different handling",
        "Sex code mapping assumes 'X' means 'Other'; verify with data source",
        "Patches should be reviewed by a domain expert before applying"
      ],
      
      metadata: {
        analysisTime: 1000,
        modelsUsed: ["mock-ingestion-analyzer-v1"],
        apiVersion: "mock-v1"
      }
    };
  }

  /**
   * Analyze translation errors
   * 
   * @param context - Context about the translation step and errors
   * @returns Mock agent response with suggestions
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/agent
   */
  async analyzeTranslationErrors(context: AgentContext): Promise<AgentResponse> {
    await mockDelay(900);

    return {
      rootCause: "Field mapping issues detected. Some source fields don't align with the expected FHIR-like structure, likely due to schema evolution or data source variations.",
      
      suggestions: [
        {
          id: "trans-1",
          type: "fix",
          priority: "high",
          title: "Map Missing Demographics Fields",
          description: "Some demographic fields are not translating correctly to FHIR structure.",
          actions: [
            "Review field mapping configuration",
            "Add fallback mappings for common variations",
            "Update translation rules to handle null values"
          ],
          confidence: 0.88
        },
        {
          id: "trans-2",
          type: "warning",
          priority: "medium",
          title: "Diagnosis Field Concatenation",
          description: "Multiple diagnosis fields should be properly arrayed, not concatenated.",
          actions: [
            "Split concatenated diagnosis strings",
            "Preserve diagnosis ordering",
            "Maintain ICD-10 code associations"
          ],
          confidence: 0.76
        }
      ],
      
      narrative: `Translation analysis complete. The main issue is schema mismatch between the CSV format and expected FHIR-like structure.
      
Key findings:
- Demographics translation is 95% successful
- Diagnosis and medication arrays need proper handling
- Lab values require unit standardization

Implementing the suggested field mappings would improve translation success rate to approximately 98%.`,
      
      confidence: 0.79,
      limitations: ["FHIR compliance not fully validated", "Custom fields may need manual mapping"],
      
      metadata: {
        analysisTime: 900,
        modelsUsed: ["mock-translation-analyzer-v1"],
        apiVersion: "mock-v1"
      }
    };
  }

  /**
   * Analyze normalization issues
   * 
   * @param context - Context about the normalization step and issues
   * @returns Mock agent response with suggestions
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/agent
   */
  async analyzeNormalizationIssues(context: AgentContext): Promise<AgentResponse> {
    await mockDelay(1200);

    return {
      rootCause: "Several medical codes and terms could not be mapped to standard terminologies (ICD-10, RxNorm, LOINC). This is typically due to informal descriptions, misspellings, or outdated codes.",
      
      suggestions: [
        {
          id: "norm-1",
          type: "fix",
          priority: "high",
          title: "Map Common Diagnosis Variants",
          description: "Unrecognized diagnosis descriptions can be mapped to standard ICD-10 codes.",
          actions: [
            "Map 'Hyperglycemia NOS' to ICD-10 R73.9",
            "Map 'Sugar diabetes' to E11.9 (Type 2 Diabetes)",
            "Create synonym dictionary for common variations"
          ],
          confidence: 0.91
        },
        {
          id: "norm-2",
          type: "fix",
          priority: "high",
          title: "Standardize Medication Names",
          description: "Medication names need normalization to RxNorm codes.",
          actions: [
            "Map brand names to generic equivalents",
            "Handle dosage strings separately from drug names",
            "Use RxNorm API for fuzzy matching"
          ],
          confidence: 0.84
        },
        {
          id: "norm-3",
          type: "warning",
          priority: "medium",
          title: "Lab Code Ambiguity",
          description: "Some lab test names are ambiguous and map to multiple LOINC codes.",
          actions: [
            "Request additional context (e.g., specimen type)",
            "Use most common LOINC code as default",
            "Flag ambiguous mappings for review"
          ],
          confidence: 0.72
        },
        {
          id: "norm-4",
          type: "enhancement",
          priority: "low",
          title: "Implement Fuzzy Matching",
          description: "Use fuzzy string matching to handle misspellings and variations.",
          actions: [
            "Implement Levenshtein distance matching",
            "Set confidence thresholds for auto-mapping",
            "Queue low-confidence matches for human review"
          ],
          confidence: 0.68
        }
      ],
      
      patches: [
        {
          recordId: "P010",
          rowIndex: 10,
          field: "diagnosis1",
          originalValue: "Hyperglycemia NOS",
          suggestedValue: "R73.9",
          reason: "Mapped to ICD-10 code for 'Hyperglycemia, unspecified'",
          confidence: 0.89
        },
        {
          recordId: "P010",
          rowIndex: 10,
          field: "medication1",
          originalValue: "Metformin HCL 500mg",
          suggestedValue: "860975",
          reason: "Mapped to RxNorm code for Metformin Hydrochloride",
          confidence: 0.94
        },
        {
          recordId: "P015",
          rowIndex: 15,
          field: "lab1",
          originalValue: "Blood sugar test",
          suggestedValue: "2345-7",
          reason: "Mapped to LOINC code for Glucose [Mass/volume] in Serum or Plasma",
          confidence: 0.71
        }
      ],
      
      narrative: `Normalization analysis identified ${context.errorRecords} records with unmapped medical codes.

The main categories of issues are:
1. **Diagnosis codes (40%)**: Informal descriptions like "sugar diabetes" need ICD-10 mapping
2. **Medications (35%)**: Brand names and dosage combinations complicate RxNorm mapping
3. **Lab codes (25%)**: Ambiguous test names require context for accurate LOINC assignment

My suggestions would resolve approximately 75% of unmapped codes with high confidence. The remaining 25% require human review or additional context.

Implementing fuzzy matching could improve future normalization success rates by 10-15%.`,
      
      confidence: 0.81,
      
      limitations: [
        "Medical code mappings should be validated by a clinical informaticist",
        "Some codes may be legitimately unmappable due to lack of specificity",
        "Confidence scores are estimates based on string similarity and frequency"
      ],
      
      metadata: {
        analysisTime: 1200,
        modelsUsed: ["mock-normalization-analyzer-v1", "mock-terminology-mapper-v1"],
        apiVersion: "mock-v1"
      }
    };
  }

  /**
   * Analyze scoring issues
   * 
   * @param context - Context about the scoring step
   * @returns Mock agent response with suggestions
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/agent
   */
  async analyzeScoringIssues(context: AgentContext): Promise<AgentResponse> {
    await mockDelay(700);

    return {
      rootCause: "Data quality scores are lower than expected due to missing values and inconsistent data entry patterns.",
      
      suggestions: [
        {
          id: "score-1",
          type: "info",
          priority: "medium",
          title: "Improve Demographics Completeness",
          description: "Demographics domain has missing height/weight values affecting BMI calculations.",
          actions: [
            "Request complete vital signs from data source",
            "Implement statistical imputation for missing values",
            "Flag records needing manual review"
          ],
          confidence: 0.83
        }
      ],
      
      narrative: "Scoring analysis shows overall data quality at 72%, with demographics and labs being the weakest domains.",
      confidence: 0.77,
      limitations: ["PIQI-lite scoring is simplified compared to full PIQI"],
      
      metadata: {
        analysisTime: 700,
        modelsUsed: ["mock-scoring-analyzer-v1"],
        apiVersion: "mock-v1"
      }
    };
  }

  /**
   * Analyze enrichment issues
   * 
   * @param context - Context about the enrichment step
   * @returns Mock agent response with suggestions
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/agent
   */
  async analyzeEnrichmentIssues(context: AgentContext): Promise<AgentResponse> {
    await mockDelay(600);

    return {
      rootCause: "Enrichment calculations failed for some records due to missing prerequisite data (height, weight, lab values).",
      
      suggestions: [
        {
          id: "enr-1",
          type: "warning",
          priority: "high",
          title: "Handle Missing BMI Components",
          description: "BMI cannot be calculated without both height and weight.",
          actions: [
            "Skip BMI calculation for incomplete records",
            "Use statistical models to estimate when appropriate",
            "Flag for clinical review"
          ],
          confidence: 0.86
        }
      ],
      
      narrative: "Enrichment completed for 85% of records. Missing data prevented calculations for the remainder.",
      confidence: 0.80,
      limitations: ["Risk scores are simplified models", "Missing data impacts accuracy"],
      
      metadata: {
        analysisTime: 600,
        modelsUsed: ["mock-enrichment-analyzer-v1"],
        apiVersion: "mock-v1"
      }
    };
  }

  /**
   * Process analytics query (Ask Anything feature)
   * 
   * @param request - Natural language query request
   * @returns Mock query response
   * 
   * TODO Phase 2: Replace with real API call to POST /archia/query
   */
  async queryAnalytics(request: ArchiaQueryRequest): Promise<ArchiaQueryResponse> {
    await mockDelay(1500);

    // Mock response based on common diabetes cohort questions
    const mockResponses: Record<string, ArchiaQueryResponse> = {
      default: {
        answer: "Based on the normalized dataset, I found 7 patients (35% of the cohort) meeting your criteria. The average A1C for this group is 9.8%, indicating poor glycemic control.",
        
        supporting_analysis: "Analysis performed on v3_enriched dataset containing 20 patient records. Filtered by diagnosis codes E10.* (Type 1 Diabetes) and lab values for A1C (LOINC 4548-4) > 9.0% within the past 12 months.",
        
        suggested_visualizations: [
          {
            type: "bar",
            metric: "a1c_distribution",
            title: "A1C Distribution",
            data: {
              buckets: ["<7.0", "7.0-9.0", ">9.0"],
              counts: [5, 8, 7]
            }
          }
        ],
        
        follow_up_questions: [
          "What is the average time in range for these patients?",
          "How many patients improved their A1C over the past 6 months?",
          "What medications are most commonly prescribed for this group?"
        ],
        
        raw_result: {
          query_time_ms: 1500,
          records_scanned: 20,
          matching_records: 7
        }
      }
    };

    // Return default mock response
    return mockResponses.default;
  }

  /**
   * Convert internal AgentContext to Archia request format
   * 
   * TODO Phase 2: This will handle the actual API request formatting
   */
  private toArchiaRequest(context: AgentContext): ArchiaAgentRequest {
    return {
      step: context.step,
      ai_enabled: context.aiEnabled,
      error_type: context.sampleErrors?.[0]?.type,
      error_details: {
        total_errors: context.errorRecords,
        sample_size: context.sampleErrors?.length || 0
      },
      sample_records: context.sampleRecords?.map((record, index) => ({
        rowIndex: index + 1,
        raw: record
      })),
      context: {
        dataset_version: context.datasetVersion,
        run_id: context.runId
      }
    };
  }

  /**
   * Convert Archia response to internal AgentResponse format
   * 
   * TODO Phase 2: This will handle the actual API response parsing
   */
  private fromArchiaResponse(archiaResponse: ArchiaAgentResponse): AgentResponse {
    return {
      rootCause: archiaResponse.root_cause,
      suggestions: archiaResponse.suggested_fixes.map((fix, index) => ({
        id: `suggestion-${index}`,
        type: 'fix' as const,
        priority: 'medium' as const,
        title: `Suggestion ${index + 1}`,
        description: fix,
        confidence: 0.75
      })),
      patches: archiaResponse.patched_rows?.map(row => ({
        recordId: `P${row.rowIndex.toString().padStart(3, '0')}`,
        rowIndex: row.rowIndex,
        field: Object.keys(row.patched)[0],
        originalValue: null, // Would need to be provided
        suggestedValue: Object.values(row.patched)[0],
        reason: "AI suggested fix",
        confidence: row.patch_metadata?.confidence || 0.5
      })),
      narrative: archiaResponse.step_by_step_report,
      limitations: archiaResponse.insights
        ?.filter(i => i.type === 'warning')
        .map(i => i.message)
    };
  }
}