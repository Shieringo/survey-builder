// ============================================================
// supabase.config.js
// 全HTMLファイルから読み込む共通設定
//
// ★ 以下の2行を自分のプロジェクトの値に書き換えてください ★
// Supabase管理画面 → Settings → API から取得
// ============================================================

const SUPABASE_URL  = 'https://sqagawuubujrcyxkmwbg.supabase.co';
const SUPABASE_KEY  = 'sb_publishable_wmDriUhLXbcQcdd5UZMivQ_k7oe2HYC';

// ============================================================
// Supabase クライアント初期化
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// 共通ヘルパー関数
// ============================================================

/** アンケート一覧を取得 */
export async function getSurveys() {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** アンケート1件 + 設問 + 選択肢を取得 */
export async function getSurveyWithQuestions(surveyId) {
  const { data: survey, error: e1 } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', surveyId)
    .single();
  if (e1) throw e1;

  const { data: questions, error: e2 } = await supabase
    .from('questions')
    .select('*, options(*)')
    .eq('survey_id', surveyId)
    .order('position');
  if (e2) throw e2;

  return { ...survey, questions };
}

/** アンケートを保存（新規 or 更新） */
export async function saveSurvey(survey) {
  const { data, error } = await supabase
    .from('surveys')
    .upsert({ ...survey, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** 設問を保存 */
export async function saveQuestion(question) {
  const { data, error } = await supabase
    .from('questions')
    .upsert(question)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** 回答を送信 */
export async function submitResponse(surveyId, answers) {
  // 回答セッションを作成
  const { data: response, error: e1 } = await supabase
    .from('responses')
    .insert({ survey_id: surveyId, completed: true, finished_at: new Date().toISOString() })
    .select()
    .single();
  if (e1) throw e1;

  // 各設問の回答を保存
  const answerRows = answers.map(a => ({
    response_id: response.id,
    question_id: a.questionId,
    value:  a.value  || '',
    values: a.values || [],
  }));
  const { error: e2 } = await supabase.from('answers').insert(answerRows);
  if (e2) throw e2;

  return response;
}

/** 集計データを取得 */
export async function getStats(surveyId) {
  const { count: total } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true })
    .eq('survey_id', surveyId)
    .eq('completed', true);

  const { data: recent } = await supabase
    .from('responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('finished_at', { ascending: false })
    .limit(10);

  return { total, recent };
}
