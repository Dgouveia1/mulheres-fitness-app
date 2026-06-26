import { supabase } from '../lib/supabase'
import { STAFF_ROLES, MANAGED_STAFF_ROLES } from '../lib/roles'

// =========================================================================
// FITFLIX (VÍDEOS)
// =========================================================================

export async function getVideos() {
  const { data, error } = await supabase
    .from('fitflix_videos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return data
}

export async function getVideoById(id) {
  if (!id) return null
  const { data, error } = await supabase
    .from('fitflix_videos')
    .select('*')
    .eq('id', id)
    .single()
  return error ? null : data
}

export async function uploadFitFlixFile(file, folder) {
  const cleanName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]/g, '_')
  const filePath = `${folder}/${Date.now()}_${cleanName}`
  const { error } = await supabase.storage.from('fitflix_content').upload(filePath, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('fitflix_content').getPublicUrl(filePath)
  return publicUrl
}

export async function createVideo(videoData) {
  const { data, error } = await supabase.from('fitflix_videos').insert([videoData]).select().single()
  return { data, error }
}

export async function updateVideo(id, updateData) {
  const { data, error } = await supabase.from('fitflix_videos').update(updateData).eq('id', id).select().single()
  return { data, error }
}

export async function deleteVideo(id) {
  const { error } = await supabase.from('fitflix_videos').delete().eq('id', id)
  return { error }
}

export async function getFitFlixCategories() {
  const { data, error } = await supabase.from('fitflix_categories').select('*').order('name')
  return error ? [] : data
}

export async function createFitFlixCategory(name) {
  const { data, error } = await supabase.from('fitflix_categories').insert([{ name }]).select().single()
  return { data, error }
}

export async function updateFitFlixCategory(id, name) {
  const { data, error } = await supabase.from('fitflix_categories').update({ name }).eq('id', id).select().single()
  return { data, error }
}

export async function deleteFitFlixCategory(id) {
  const { error } = await supabase.from('fitflix_categories').delete().eq('id', id)
  return { error }
}

// =========================================================================
// FITGRAN (SOCIAL)
// =========================================================================

export async function getPosts(currentUserId) {
  let { data, error } = await supabase
    .from('fitgran_posts')
    .select('*, profiles:user_id (full_name)')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  if (currentUserId) {
    const { data: likes } = await supabase.from('fitgran_likes').select('post_id').eq('user_id', currentUserId)
    const likedSet = new Set(likes?.map((l) => l.post_id))
    data = data.map((p) => ({ ...p, is_liked: likedSet.has(p.id) }))
  }
  return data
}

export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase.from('fitgran_likes').select('id').eq('post_id', postId).eq('user_id', userId).single()
  if (existing) {
    await supabase.from('fitgran_likes').delete().eq('id', existing.id)
  } else {
    await supabase.from('fitgran_likes').insert([{ post_id: postId, user_id: userId }])
  }
  const { count } = await supabase.from('fitgran_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId)
  await supabase.from('fitgran_posts').update({ likes_count: count }).eq('id', postId)
  return { success: true, newCount: count }
}

export async function getComments(postId) {
  const { data } = await supabase
    .from('fitgran_comments')
    .select('*, profiles:user_id (full_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function addComment(postId, userId, content) {
  const { data, error } = await supabase
    .from('fitgran_comments')
    .insert([{ post_id: postId, user_id: userId, content }])
    .select('*, profiles:user_id (full_name)')
    .single()
  return { data, error }
}

export async function uploadPostImage(file, userId) {
  const cleanName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]/g, '_')
  const filePath = `${userId}/${Date.now()}_${cleanName}`
  const { error } = await supabase.storage.from('fitgran_post').upload(filePath, file)
  if (error) return null
  const { data: { publicUrl } } = supabase.storage.from('fitgran_post').getPublicUrl(filePath)
  return publicUrl
}

export async function createPost(userId, imageUrl, caption) {
  const { data, error } = await supabase.from('fitgran_posts').insert([{ user_id: userId, image_url: imageUrl, caption }]).select().single()
  return { data, error }
}

// =========================================================================
// TREINOS (APP ALUNA)
// =========================================================================

export async function getMyWorkouts(userId) {
  const { data } = await supabase
    .from('workouts')
    .select(`*, items:workout_items (id, sets, reps, rest_seconds, suggested_load_kg, order_index, exercise:exercises (id, name, image_url, video_url, muscle_group))`)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })
  if (data) data.forEach((w) => { if (w.items) w.items.sort((a, b) => a.order_index - b.order_index) })
  return data || []
}

export async function logWorkoutSet(logData) {
  const { error } = await supabase.from('workout_logs').insert([logData])
  return { error }
}

export async function getDashboardStats(userId) {
  const { count } = await supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  return { completedWorkouts: count || 0 }
}

// Estatísticas de evolução da aluna (gamificação): dias treinados, frequência
// da semana atual e streak de dias consecutivos — derivados de workout_logs.
export async function getUserStats(userId) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('performed_at')
    .eq('user_id', userId)
    .limit(5000)
  const logs = error ? [] : (data || [])
  // Bucketiza por data LOCAL (en-CA => YYYY-MM-DD) de forma consistente
  const localDay = (d) => d.toLocaleDateString('en-CA')
  const daySet = new Set(logs.map((l) => (l.performed_at ? localDay(new Date(l.performed_at)) : null)).filter(Boolean))
  const trainingDays = daySet.size

  // Frequência da semana atual (Dom..Sáb)
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return daySet.has(localDay(d))
  })

  // Streak: dias consecutivos até hoje (ou ontem, se ainda não treinou hoje)
  let streak = 0
  const cursor = new Date(today)
  if (!daySet.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (daySet.has(localDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { trainingDays, week, streak }
}

// =========================================================================
// AGENDA & CLIENTES
// =========================================================================

export async function getAppointments(startDate, endDate) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('time', { ascending: true })
  return error ? [] : data
}

export async function searchAppointments(term) {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .ilike('client_name', `%${term}%`)
    .order('date', { ascending: false })
    .order('time', { ascending: true })
    .limit(50)
  return error ? [] : data
}

export async function checkAppointmentAvailability(date, time, type, excludeId = null) {
  let query = supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)
    .eq('time', time)
    .eq('type', type)
    .neq('status', 'cancelled')
  if (excludeId) query = query.neq('id', excludeId)
  const { count, error } = await query
  // fail-open: se a verificação falhar, deixa o banco ser a fonte da verdade
  if (error) return { available: true, error }
  return { available: count === 0, error: null }
}

export async function createAppointment(apptData) {
  const { data, error } = await supabase.from('appointments').insert([apptData]).select().single()
  return { data, error }
}

export async function updateAppointment(id, apptData) {
  const { data, error } = await supabase.from('appointments').update(apptData).eq('id', id).select().single()
  return { data, error }
}

export async function deleteAppointment(id) {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  return { error }
}

export async function getClients() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'user').order('full_name')
  return error ? [] : data
}

export async function createClientAccount(email, password, fullName, unit) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: 'user', unit } },
  })
  return { data, error }
}

export async function getClientDetails(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data, error }
}

export async function getAssessments(userId) {
  const { data, error } = await supabase.from('assessments').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) return []
  return data
}

export async function createAssessment(payload) {
  const { data, error } = await supabase.from('assessments').insert([payload]).select().single()
  return { data, error }
}

// =========================================================================
// CHAT
// =========================================================================

// Retorna TODOS os perfis (equipe + alunas) — o app de produção permite que a
// equipe converse com alunas. A separação por aba (Equipe/Alunas) é feita na UI.
export async function getChatContacts() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, unit')
    .order('full_name')
    .limit(500)
  return error ? [] : data
}

export async function getRecentMessagesSummary(currentUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('sender_id, recipient_id, content, created_at')
    .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId},recipient_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return data
}

export async function getChatMessages(senderId, recipientId, limit = 50, offset = 0) {
  let query = supabase.from('messages').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (recipientId === 'STAFF_GROUP') {
    query = query.is('recipient_id', null)
  } else {
    query = query.or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
  }
  const { data, error } = await query
  return error ? [] : data.reverse()
}

export async function sendMessage(senderId, recipientId, content, senderName = 'Usuário') {
  const payload = {
    sender_id: senderId,
    content,
    sender_name: senderName,
    recipient_id: recipientId === 'STAFF_GROUP' ? null : recipientId,
  }
  const { data, error } = await supabase.from('messages').insert([payload]).select().single()
  return { data, error }
}

// =========================================================================
// GESTÃO DE TREINOS (ADMIN)
// =========================================================================

export async function uploadExerciseAsset(file) {
  const cleanName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]/g, '_')
  const filePath = `${Date.now()}_${cleanName}`
  const { error } = await supabase.storage.from('exercise-assets').upload(filePath, file, { cacheControl: '3600', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('exercise-assets').getPublicUrl(filePath)
  return publicUrl
}

export async function getAllExercises() {
  const { data, error } = await supabase.from('exercises').select('*').order('name')
  return error ? [] : data
}

export async function createExercise(exData) {
  const { data, error } = await supabase.from('exercises').insert([exData]).select().single()
  return { data, error }
}

export async function updateExercise(id, exData) {
  const { data, error } = await supabase.from('exercises').update(exData).eq('id', id).select().single()
  return { data, error }
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  return { error }
}

export async function getTemplates(adminId) {
  const { data } = await supabase.from('workouts').select('*, items:workout_items (count)').eq('assigned_to', adminId).order('created_at', { ascending: false })
  return data || []
}

export async function getWorkoutDetails(workoutId) {
  const { data, error } = await supabase
    .from('workouts')
    .select(`*, items:workout_items (id, sets, reps, rest_seconds, suggested_load_kg, order_index, exercise_id, exercise:exercises (id, name, muscle_group, image_url))`)
    .eq('id', workoutId)
    .single()
  if (data?.items) data.items.sort((a, b) => a.order_index - b.order_index)
  return { data, error }
}

export async function createWorkoutRoutine(workoutData, items) {
  const { data: workout, error: wError } = await supabase.from('workouts').insert([workoutData]).select().single()
  if (wError) return { error: wError }
  if (items?.length > 0) {
    const itemsPayload = items.map((item, idx) => ({
      workout_id: workout.id,
      exercise_id: item.exercise_id,
      sets: item.sets,
      reps: item.reps,
      rest_seconds: item.rest_seconds,
      suggested_load_kg: item.suggested_load_kg || 0,
      order_index: idx,
    }))
    const { error: iError } = await supabase.from('workout_items').insert(itemsPayload)
    if (iError) {
      await supabase.from('workouts').delete().eq('id', workout.id)
      return { error: iError }
    }
  }
  return { data: workout }
}

export async function deleteWorkout(id) {
  await supabase.from('workout_items').delete().eq('workout_id', id)
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  return { error }
}

// =========================================================================
// NUTRIÇÃO
// =========================================================================

export async function getActiveDiet(userId) {
  const { data: diet, error } = await supabase
    .from('diets')
    .select('*')
    .eq('assigned_to', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !diet) return null
  const { data: meals } = await supabase
    .from('diet_meals')
    .select('*, foods:diet_foods(*)')
    .eq('diet_id', diet.id)
    .order('order_index', { ascending: true })
  if (meals) meals.forEach((meal) => { if (meal.foods) meal.foods.sort((a, b) => a.order_index - b.order_index) })
  return { ...diet, meals: meals || [] }
}

export async function getDietTemplates(adminId) {
  const { data } = await supabase.from('diets').select('*').eq('assigned_to', adminId).order('created_at', { ascending: false })
  return data || []
}

export async function getDietById(dietId) {
  const { data: diet, error } = await supabase.from('diets').select('*').eq('id', dietId).single()
  if (error || !diet) return null
  const { data: meals } = await supabase.from('diet_meals').select('*, foods:diet_foods(*)').eq('diet_id', diet.id).order('order_index', { ascending: true })
  if (meals) meals.forEach((meal) => { if (meal.foods) meal.foods.sort((a, b) => a.order_index - b.order_index) })
  return { ...diet, meals: meals || [] }
}

export async function createDietPlan(dietHeader, mealsData) {
  const { data: diet, error: dError } = await supabase.from('diets').insert([dietHeader]).select().single()
  if (dError) return { error: dError }
  for (let i = 0; i < mealsData.length; i++) {
    const meal = mealsData[i]
    const { data: newMeal, error: mError } = await supabase
      .from('diet_meals')
      .insert([{ diet_id: diet.id, name: meal.name, time: meal.time, order_index: i }])
      .select()
      .single()
    if (mError) continue
    if (meal.foods?.length > 0) {
      const foodsPayload = meal.foods.map((f, idx) => ({ meal_id: newMeal.id, food_item: f.food_item, portion: f.portion, order_index: idx }))
      await supabase.from('diet_foods').insert(foodsPayload)
    }
  }
  return { data: diet }
}

// =========================================================================
// PERFIL
// =========================================================================

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return { data, error }
}

export async function updateProfile(userId, profileData) {
  const { data, error } = await supabase.from('profiles').update(profileData).eq('id', userId).select().single()
  return { data, error }
}

export async function uploadAvatar(file, userId) {
  const ext = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
  return publicUrl
}

// =========================================================================
// ADMIN DASHBOARD
// =========================================================================

export async function getAdminStats() {
  const today = new Date().toISOString().split('T')[0]
  const [{ count: todayAppts }, { count: activeClients }] = await Promise.all([
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
  ])
  return { todayAppts: todayAppts || 0, activeClients: activeClients || 0 }
}

// =========================================================================
// USUÁRIOS (STAFF) — somente superadmin
// =========================================================================

// Lista lê direto da tabela (profiles tem leitura pública).
export async function getStaffUsers() {
  const { data, error } = await supabase
    .from('profiles').select('*')
    .in('role', MANAGED_STAFF_ROLES)
    .order('full_name')
  return error ? [] : data
}

// Mutações vão pela Edge Function admin-users (service_role).
async function adminUsers(payload) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: payload })
  // A função retorna 4xx com { error } em caso de falha; normaliza a mensagem.
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch (_) { /* ignora parse */ }
    return { data: null, error: { message } }
  }
  if (data?.error) return { data: null, error: { message: data.error } }
  return { data, error: null }
}

export const createStaffUser = (payload) => adminUsers({ action: 'create', ...payload })
export const updateStaffUser = (id, payload) => adminUsers({ action: 'update', id, ...payload })
export const deleteStaffUser = (id) => adminUsers({ action: 'delete', id })
