export const swaggerDocument = {
    openapi: "3.0.0",
    info: {
        title: "Refy API",
        version: "1.0.0",
    },

    servers: [
        {
            url: "http://localhost:8080",
            description: "Local development server",
        },
    ],

    tags: [
        {
            name: "Google OAuth",
            description: "Authentication endpoints using Google OAuth.",
        },
        {
            name: "Wardrobe",
            description: "Endpoints for managing wardrobe image uploads and retrieval.",
        },
    ],

    paths: {
        // -------------------- AUTH --------------------
        "/api/v1/auth/google": {
            post: {
                tags: ["Google OAuth"],
                summary: "Google login",
                description:
                    // CHANGED: no cookies; tokens returned in JSON body.
                    "Receives a Google ID token, verifies it, and returns the user along with access and refresh tokens in the response body.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["idToken"],
                                properties: {
                                    idToken: {
                                        type: "string",
                                        description: "Google ID token from client",
                                    },
                                },
                                example: {
                                    idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Successfully authenticated with Google",
                        // CHANGED: removed Set-Cookie header; everything is in JSON now.
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/GoogleAuthResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Missing or invalid idToken",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        "/api/v1/auth/get-access": {
            // CHANGED: method GET -> POST and uses body refreshToken instead of cookie.
            post: {
                tags: ["Google OAuth"],
                summary: "Get new access token",
                description:
                    "Receives a refresh token in the request body, verifies it, and issues a new access token along with the user.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["refreshToken"],
                                properties: {
                                    refreshToken: {
                                        type: "string",
                                        description: "JWT refresh token",
                                        example:
                                            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.REFRESH...",
                                    },
                                },
                            },
                        },
                    },
                },
                // CHANGED: no cookie-based security here.
                responses: {
                    "200": {
                        description: "New access token issued successfully.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/GoogleAuthResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description: "Missing or invalid refresh token.",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // -------------------- WARDROBE: PRESIGN --------------------
        "/api/v1/wardrobe/upload/presign": {
            post: {
                tags: ["Wardrobe"],
                summary: "Generate S3 presigned URLs",
                description:
                    // CHANGED: no accessToken cookie, use Authorization header.
                    "Receives file metadata and returns presigned URLs along with S3 keys. Authentication required via Authorization: Bearer <accessToken> header.",
                security: [
                    // CHANGED: use bearer token security.
                    {
                        AccessTokenAuth: [],
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["files"],
                                properties: {
                                    files: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            required: ["filename", "contentType", "size"],
                                            properties: {
                                                filename: {
                                                    type: "string",
                                                    example: "cap.jpg",
                                                },
                                                contentType: {
                                                    type: "string",
                                                    example: "image/jpeg",
                                                },
                                                size: {
                                                    type: "integer",
                                                    example: 121234,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Presigned URLs created successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/PresignUploadResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Invalid request body",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description:
                            "Unauthorized - Missing or invalid access token in Authorization header",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // -------------------- WARDROBE: DIRECT S3 UPLOAD (PRESIGNED PUT) --------------------
        "/dev/users/{userId}/uploads/{batchId}/{filename}": {
            put: {
                tags: ["Wardrobe"],
                summary: "Upload image to S3 using presigned URL",
                description:
                    "Uploads a single image file directly to the S3 bucket using a presigned URL. This operation is called on the URL returned by the presign API. Do NOT send Authorization headers; all authentication is contained in the query parameters.",
                servers: [
                    {
                        url: "https://aiwardrobe.s3.ap-south-1.amazonaws.com",
                    },
                ],
                parameters: [
                    {
                        name: "userId",
                        in: "path",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "6931514e3109c8b3fd9ac9aa",
                    },
                    {
                        name: "batchId",
                        in: "path",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "2025-12-09T07:14:00.922Z_batch_cd7ac650",
                    },
                    {
                        name: "filename",
                        in: "path",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "c3d382c2-7b51-400e-97ed-00e70029e104.jpg",
                    },
                    {
                        name: "X-Amz-Algorithm",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "AWS4-HMAC-SHA256",
                    },
                    {
                        name: "X-Amz-Content-Sha256",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "UNSIGNED-PAYLOAD",
                    },
                    {
                        name: "X-Amz-Credential",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "AKIAxxxxxxxx/20251209/ap-south-1/s3/aws4_request",
                    },
                    {
                        name: "X-Amz-Date",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "20251209T071400Z",
                    },
                    {
                        name: "X-Amz-Expires",
                        in: "query",
                        required: true,
                        schema: {
                            type: "integer",
                        },
                        example: 900,
                    },
                    {
                        name: "X-Amz-Signature",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "f34a739daf1ec2aa1702f8dfcf0a39b09bcae3d23e35b0341649df8e5f47db3b",
                    },
                    {
                        name: "X-Amz-SignedHeaders",
                        in: "query",
                        required: true,
                        schema: {
                            type: "string",
                        },
                        example: "host",
                    },
                    {
                        name: "x-amz-acl",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string",
                        },
                        example: "private",
                    },
                    {
                        name: "x-amz-checksum-crc32",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string",
                        },
                        example: "AAAAAA==",
                    },
                    {
                        name: "x-amz-sdk-checksum-algorithm",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string",
                        },
                        example: "CRC32",
                    },
                    {
                        name: "x-id",
                        in: "query",
                        required: false,
                        schema: {
                            type: "string",
                        },
                        example: "PutObject",
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "image/jpeg": {
                            schema: {
                                type: "string",
                                format: "binary",
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "File uploaded successfully to S3.",
                    },
                },
            },
        },

        // -------------------- WARDROBE: COMPLETE UPLOAD --------------------
        "/api/v1/wardrobe/upload/complete": {
            post: {
                tags: ["Wardrobe"],
                summary: "Complete wardrobe upload and fetch image metadata",
                description:
                    // CHANGED: no cookie; uses Authorization header.
                    "Takes a list of S3 object keys for uploaded wardrobe images, fetches their metadata from the database, and returns paginated results along with signed URLs for access. Requires Authorization: Bearer <accessToken> header.",
                security: [
                    {
                        AccessTokenAuth: [],
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["keys"],
                                properties: {
                                    keys: {
                                        type: "array",
                                        description:
                                            "List of S3 object keys for the uploaded wardrobe images.",
                                        items: {
                                            type: "string",
                                            example:
                                                "dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07:14:00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg",
                                        },
                                    },
                                },
                            },
                            example: {
                                keys: [
                                    "dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07:14:00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg",
                                ],
                            },
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Wardrobe uploaded images fetched successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/WardrobeListResponse",
                                },
                            },
                        },
                    },
                    "400": {
                        description: "Bad request (e.g. keys missing or invalid)",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description:
                            "Unauthorized - Missing or invalid access token in Authorization header",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },

        // -------------------- WARDROBE: LIST IMAGES --------------------
        "/api/v1/wardrobe/images": {
            get: {
                tags: ["Wardrobe"],
                summary: "Get wardrobe uploaded images",
                description:
                    // CHANGED: cookie -> Authorization header.
                    "Returns paginated wardrobe images for the authenticated user, including signed URLs to access each image. Authentication required via Authorization: Bearer <accessToken> header.",
                security: [
                    {
                        AccessTokenAuth: [],
                    },
                ],
                parameters: [
                    {
                        in: "query",
                        name: "page",
                        required: false,
                        schema: {
                            type: "integer",
                            default: 1,
                            example: 1,
                        },
                        description: "Page number for pagination.",
                    },
                    {
                        in: "query",
                        name: "limit",
                        required: false,
                        schema: {
                            type: "integer",
                            default: 20,
                            example: 20,
                        },
                        description: "Number of items per page.",
                    },
                ],
                responses: {
                    "200": {
                        description: "Wardrobe uploaded images fetched successfully",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/WardrobeListResponse",
                                },
                            },
                        },
                    },
                    "401": {
                        description:
                            "Unauthorized - Missing or invalid access token in Authorization header",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/ErrorResponse",
                                },
                            },
                        },
                    },
                },
            },
        },
    },

    components: {
        securitySchemes: {
            // CHANGED: switched from cookie-based apiKey to standard Bearer JWT.
            AccessTokenAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
            // NOTE: no RefreshTokenCookieAuth anymore; refresh is sent in body.
        },

        schemas: {
            User: {
                type: "object",
                required: ["_id", "googleId", "name", "email", "avatar"],
                properties: {
                    _id: {
                        type: "string",
                        description: "MongoDB user ID",
                        example: "6931514e3109c8b3fd9ac9aa",
                    },
                    googleId: {
                        type: "string",
                        description: "Google account ID",
                        example: "109090528425531358191",
                    },
                    name: {
                        type: "string",
                        example: "Jane Doe",
                    },
                    email: {
                        type: "string",
                        format: "email",
                        example: "JaneD@iviewlabs.com",
                    },
                    avatar: {
                        type: "string",
                        format: "uri",
                        description: "Google profile picture URL",
                        example:
                            "https://lh3.googleusercontent.com/a/ACg8ojhZdnlgVGLZWr3KIv9Vw_sRgK723qGAPLQ=s96-c",
                    },
                },
            },

            GoogleAuthResponse: {
                type: "object",
                required: ["user", "accessToken"], // CHANGED: refreshToken is optional but present on login.
                properties: {
                    user: {
                        $ref: "#/components/schemas/User",
                    },
                    accessToken: {
                        type: "string",
                        description: "JWT access token",
                        example:
                            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTMxNTE0ZTMxMDljOGIzZmQ5YWM5YWEiLCJpYXQiOjE3MzM2MDQ2MDAsImV4cCI6MTczMzYwODIwMH0.XXX",
                    },
                    // CHANGED: added refreshToken to support mobile (no cookies).
                    refreshToken: {
                        type: "string",
                        description: "Long-lived JWT refresh token (used to get new access tokens)",
                        example:
                            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.REFRESH_TOKEN_EXAMPLE",
                    },
                },
            },

            ErrorResponse: {
                type: "object",
                properties: {
                    error: {
                        type: "string",
                        example: "Missing idToken",
                    },
                },
            },

            PresignedUploadEntry: {
                type: "object",
                required: ["key", "uploadUrl"],
                properties: {
                    key: {
                        type: "string",
                        description: "S3 object key where the file will be stored.",
                        example:
                            "dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07:14:00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg",
                    },
                    uploadUrl: {
                        type: "string",
                        description:
                            "S3 presigned URL for uploading the file with HTTP PUT.",
                        example:
                            "https://aiwardrobe.s3.ap-south-1.amazonaws.com/dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07%3A14%3A00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAxxxxxxxx%2F20251209%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20251209T071400Z&X-Amz-Expires=900&X-Amz-Signature=f34a739daf1ec2aa1702f8dfcf0a39b09bcae3d23e35b0341649df8e5f47db3b&X-Amz-SignedHeaders=host&x-amz-acl=private&x-amz-checksum-crc32=AAAAAA%3D%3D&x-amz-sdk-checksum-algorithm=CRC32&x-id=PutObject",
                    },
                },
            },

            PresignUploadResponse: {
                type: "object",
                properties: {
                    presigned: {
                        type: "array",
                        description:
                            "List of presigned upload entries for each requested file.",
                        items: {
                            $ref: "#/components/schemas/PresignedUploadEntry",
                        },
                    },
                    batchId: {
                        type: "string",
                        description:
                            "Identifier for this batch of uploads, reused when saving metadata later.",
                        example: "2025-12-09T07:14:00.922Z_batch_cd7ac650",
                    },
                },
            },

            WardrobeItem: {
                type: "object",
                properties: {
                    _id: {
                        type: "string",
                        example: "6937cc38c5870fc8dd5508b4",
                    },
                    userId: {
                        type: "string",
                        example: "6931514e3109c8b3fd9ac9aa",
                    },
                    batchId: {
                        type: "string",
                        example: "2025-12-09T07:14:00.922Z_batch_cd7ac650",
                    },
                    key: {
                        type: "string",
                        example:
                            "dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07:14:00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg",
                    },
                    mime: {
                        type: "string",
                        example: "image/jpg",
                    },
                    size: {
                        type: "integer",
                        example: 25053,
                    },
                    status: {
                        type: "string",
                        example: "uploaded",
                    },
                    tags: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                        example: [],
                    },
                    thumbnailKey: {
                        type: "string",
                        nullable: true,
                        example: null,
                    },
                    createdAt: {
                        type: "string",
                        example: "2025-12-09T07:14:00.984Z",
                    },
                    updatedAt: {
                        type: "string",
                        example: "2025-12-09T07:22:35.299Z",
                    },
                    url: {
                        type: "string",
                        description: "Temporary signed URL to view the image.",
                        example:
                            "https://aiwardrobe.s3.ap-south-1.amazonaws.com/dev/users/6931514e3109c8b3fd9ac9aa/uploads/2025-12-09T07%3A14%3A00.922Z_batch_cd7ac650/c3d382c2-7b51-400e-97ed-00e70029e104.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&X-Amz-Signature=...",
                    },
                    __v: {
                        type: "integer",
                        example: 0,
                    },
                },
            },

            WardrobeListResponse: {
                type: "object",
                properties: {
                    statusCode: {
                        type: "integer",
                        example: 200,
                    },
                    message: {
                        type: "string",
                        example: "Wardrobe uploaded images fetched successfully",
                    },
                    data: {
                        type: "object",
                        properties: {
                            total: {
                                type: "integer",
                                example: 3,
                            },
                            page: {
                                type: "integer",
                                example: 1,
                            },
                            limit: {
                                type: "integer",
                                example: 20,
                            },
                            items: {
                                type: "array",
                                items: {
                                    $ref: "#/components/schemas/WardrobeItem",
                                },
                            },
                        },
                    },
                    success: {
                        type: "boolean",
                        example: true,
                    },
                },
            },
        },
    },
};
