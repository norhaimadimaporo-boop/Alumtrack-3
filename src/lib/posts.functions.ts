import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  createPost,
  deletePost,
  listAdminPosts,
  listPublishedPosts,
  setPostStatus,
  updatePost,
  uploadPostImage,
} from "./posts.server";

const postInputSchema = z.object({
  id: z.number().int().positive().optional(),
  type: z.enum(["Announcement", "News / Event", "Job Offering"]),
  title: z.string().max(255),
  content: z.string().max(20_000),
  excerpt: z.string().max(500),
  status: z.enum(["Published", "Draft"]),
  postedAt: z.string().max(10),
  company: z.string().max(255),
  location: z.string().max(255),
  jobType: z.string().max(100),
  salary: z.string().max(160),
  deadline: z.string().max(10),
  qualifications: z.string().max(4_000),
  applyLink: z.string().max(500),
  images: z.array(z.string().max(1_500)).max(5),
  featured: z.boolean(),
});

const postIdSchema = z.object({
  id: z.number().int().positive(),
});

const statusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["Published", "Draft"]),
});

const imageSchema = z.object({
  // Compressed client-side; ~4 MB of base64 stays under the 4.5 MB body limit.
  dataUrl: z.string().min(32, "Choose an image to upload.").max(4_400_000, "The image is too large."),
});

export const getPublishedPosts = createServerFn({ method: "GET" }).handler(async () =>
  listPublishedPosts(),
);

export const getAdminPosts = createServerFn({ method: "GET" }).handler(async () => listAdminPosts());

export const createPostRecord = createServerFn({ method: "POST" })
  .validator(postInputSchema)
  .handler(async ({ data }) => createPost(data));

export const updatePostRecord = createServerFn({ method: "POST" })
  .validator(postInputSchema)
  .handler(async ({ data }) => updatePost(data));

export const setPostStatusRecord = createServerFn({ method: "POST" })
  .validator(statusSchema)
  .handler(async ({ data }) => setPostStatus(data.id, data.status));

export const deletePostRecord = createServerFn({ method: "POST" })
  .validator(postIdSchema)
  .handler(async ({ data }) => deletePost(data.id));

export const uploadPostImageFile = createServerFn({ method: "POST" })
  .validator(imageSchema)
  .handler(async ({ data }) => uploadPostImage(data.dataUrl));
