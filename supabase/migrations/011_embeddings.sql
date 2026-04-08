-- Búsqueda semántica sobre reuniones con embeddings de OpenAI.
-- Requiere la extensión pgvector (soportada nativamente por Supabase).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS meeting_embeddings (
  meeting_id  UUID PRIMARY KEY REFERENCES meetings(id) ON DELETE CASCADE,
  embedding   VECTOR(1536) NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Nota sobre índice: con pocos datos (<1000 filas) conviene NO crear
-- índice IVFFlat, porque con lists alto y pocas filas muchos clusters
-- quedan vacíos y la búsqueda devuelve 0 resultados. El scan secuencial
-- sobre decenas/cientos de vectores es instantáneo.
-- Cuando la tabla crezca, crear el índice con lists ≈ sqrt(N):
--   CREATE INDEX idx_meeting_embeddings_ivfflat
--     ON meeting_embeddings USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 30);

-- Función RPC: dado un vector de consulta y una escuela, devuelve
-- los meeting_ids más similares con su score.
CREATE OR REPLACE FUNCTION match_meetings(
  query_embedding  VECTOR(1536),
  school_id_filter UUID,
  match_count      INT DEFAULT 5
)
RETURNS TABLE (meeting_id UUID, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.meeting_id,
    1 - (me.embedding <=> query_embedding) AS similarity
  FROM meeting_embeddings me
  JOIN meetings m ON m.id = me.meeting_id
  WHERE m.school_id = school_id_filter
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
