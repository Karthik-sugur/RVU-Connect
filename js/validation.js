export function validateEvent(payload) {
  if (!payload.title || !payload.description || !payload.date || !payload.time || !payload.location) {
    return { valid: false, message: "Title, description, date, time and location are required." };
  }
  if (payload.link && !/^https?:\/\//.test(payload.link)) {
    return { valid: false, message: "Link must start with http:// or https://" };
  }
  if (payload.posterUrl && !/^https?:\/\//.test(payload.posterUrl)) {
    return { valid: false, message: "Poster URL must start with http:// or https://" };
  }
  return { valid: true };
}

export function validateAnnouncement(payload) {
  if (!payload.title || !payload.description) {
    return { valid: false, message: "Title and description are required." };
  }
  if (payload.imageUrl && !/^https?:\/\//.test(payload.imageUrl)) {
    return { valid: false, message: "Image URL must start with http:// or https://" };
  }
  return { valid: true };
}

export function validateProject(payload) {
  if (!payload.title || !payload.description) {
    return { valid: false, message: "Title and description are required." };
  }
  return { valid: true };
}
