import { db } from '../lib/db'
import { chatWithGroq, type ChatMessage } from './groqChatService'
import type { Entry } from '../types'

export interface SearchResult {
    entry: Entry
    relevanceScore: number
    reason?: string
}

export async function semanticSearch(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return []

    try {
        // 1. Ask AI to identify themes and keywords for the query
        const systemPrompt: ChatMessage = {
            role: 'system',
            content: `You are a search assistant for a productivity app. 
      Analyze the user's search query and return a set of keywords or themes that would help find relevant entries in a database.
      Respond ONLY with a comma-separated list of keywords.
      
      Example:
      User: "What did I discuss with Daniel about the contract?"
      Keywords: Daniel, contract, discussion, project, legal, meeting`
        }

        const aiKeywords = await chatWithGroq([
            systemPrompt,
            { role: 'user', content: query }
        ])

        const keywords = aiKeywords.split(',').map(k => k.trim().toLowerCase())

        // 2. Initial filter from Dexie (keyword-based)
        const allEntries = await db.entries.toArray()

        const candidates = allEntries.filter(entry => {
            const content = entry.content.toLowerCase()
            const title = (entry.title || '').toLowerCase()
            const tags = (entry.tags || []).map(t => t.toLowerCase())

            return keywords.some(k =>
                content.includes(k) ||
                title.includes(k) ||
                tags.includes(k)
            )
        })

        if (candidates.length === 0) return []

        // 3. (Simplified Semantic Ranking) 
        // In a full implementation, we'd use embeddings. 
        // Here we'll rank by keyword density/match for performance.
        const results: SearchResult[] = candidates.map(entry => {
            let score = 0
            const content = entry.content.toLowerCase()
            const title = (entry.title || '').toLowerCase()

            keywords.forEach(k => {
                if (title.includes(k)) score += 3
                if (content.includes(k)) score += 1
            })

            return {
                entry,
                relevanceScore: score
            }
        })

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } catch (error) {
        console.error('Semantic search failed:', error)
        return []
    }
}
