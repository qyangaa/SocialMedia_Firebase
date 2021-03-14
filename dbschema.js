let db = {
  users: [
    {
      userId: "dh23ggj5h32g543j5gf43",
      email: "user@email.com",
      handle: "user",
      createdAt: "2019-03-15T10:59:52.798Z",
      imageUrl: "image/dsfsdkfghskdfgs/dgfdhfgdh",
      bio: "Hello, my name is user, nice to meet you",
      website: "https://user.com",
      location: "Lonodn, UK",
    },
  ],
  screams: [
    {
      userHandle: "user",
      body: "This is a sample scream",
      createdAt: "2019-03-15T10:59:52.798Z",
      likeCount: 5,
      commentCount: 3,
    },
  ],
  comments: [
    {
      userHandle: "user",
      screamId: "9x9DyRa2B3JnUFOhPT4c",
      body: "nice one mate!",
      createdAt: "2019-03-15T10:59:52.798Z",
      userImage:
        "https://firebasestorage.googleapis.com/v0/b/tutorial-4f27b.appspot.com/o/83560036259.jpg?alt=media",
    },
  ],
  notifications: [
    {
      recipient: "user",
      sender: "john",
      read: "true | false",
      screamId: "9x9DyRa2B3JnUFOhPT4c",
      type: "like | comment",
      createdAt: "2019-03-15T10:59:52.798Z",
    },
  ],
};
const userDetails = {
  // Redux data
  credentials: {
    userId: "N43KJ5H43KJHREW4J5H3JWMERHB",
    email: "user@email.com",
    handle: "user",
    createdAt: "2019-03-15T10:59:52.798Z",
    imageUrl: "image/dsfsdkfghskdfgs/dgfdhfgdh",
    bio: "Hello, my name is user, nice to meet you",
    website: "https://user.com",
    location: "Lonodn, UK",
  },
  likes: [
    {
      userHandle: "user",
      screamId: "9x9DyRa2B3JnUFOhPT4c",
    },
    {
      userHandle: "user",
      screamId: "9x9DyRa2B3JnUFOhPT4c",
    },
  ],
};
