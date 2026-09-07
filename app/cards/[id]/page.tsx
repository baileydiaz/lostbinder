import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

type FavoriteRow = {
  card_id: string
}

type CollectionCard = {
  id: string
  name: string
  rarity: string | null
  illustrator: string | null
  image_url: string | null
  set_id: string
}

export default async function CollectionPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: favoritesData,
    error: favoritesError,
  } = await supabase
    .from('card_favorites')
    .select(`
      card_id
    `)
    .eq(
      'user_id',
      user.id
    )

  if (favoritesError) {
    return (
      <main
        className="
          min-h-screen
          bg-black
          px-5
          py-10
          text-white
          sm:px-8
        "
      >
        <div
          className="
            mx-auto
            max-w-7xl
          "
        >
          <h1
            className="
              text-4xl
              font-semibold
            "
          >
            Collection
          </h1>

          <p
            className="
              mt-4
              text-red-400
            "
          >
            Could not load
            your collection:
            {' '}
            {
              favoritesError.message
            }
          </p>
        </div>
      </main>
    )
  }

  const favorites =
    (favoritesData ??
      []) as FavoriteRow[]

  const cardIds =
    favorites.map(
      (favorite) =>
        favorite.card_id
    )

  let cards:
    CollectionCard[] = []

  if (
    cardIds.length > 0
  ) {
    const {
      data: cardData,
      error: cardError,
    } = await supabase
      .from('cards')
      .select(`
        id,
        name,
        rarity,
        illustrator,
        image_url,
        set_id
      `)
      .in(
        'id',
        cardIds
      )

    if (cardError) {
      return (
        <main
          className="
            min-h-screen
            bg-black
            px-5
            py-10
            text-white
            sm:px-8
          "
        >
          <div
            className="
              mx-auto
              max-w-7xl
            "
          >
            <h1
              className="
                text-4xl
                font-semibold
              "
            >
              Collection
            </h1>

            <p
              className="
                mt-4
                text-red-400
              "
            >
              Could not load
              your cards:
              {' '}
              {
                cardError.message
              }
            </p>
          </div>
        </main>
      )
    }

    const cardById =
      new Map(
        (
          (cardData ??
            []) as CollectionCard[]
        ).map(
          (card) => [
            card.id,
            card,
          ]
        )
      )

    cards =
      cardIds
        .map(
          (id) =>
            cardById.get(
              id
            )
        )
        .filter(
          (
            card
          ): card is CollectionCard =>
            card !==
            undefined
        )
  }

  return (
    <main
      className="
        min-h-screen
        bg-black
        px-5
        py-8
        text-white
        sm:px-8
      "
    >
      <div
        className="
          mx-auto
          max-w-7xl
        "
      >
        <header
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <Link
            href="/"
            className="
              text-lg
              font-semibold
              tracking-tight
            "
          >
            LostBinder
          </Link>

          <nav
            className="
              flex
              items-center
              gap-5
              text-sm
              text-zinc-500
            "
          >
            <Link
              href="/explore"
              className="
                transition
                hover:text-white
              "
            >
              Explore
            </Link>

            <Link
              href="/friends"
              className="
                transition
                hover:text-white
              "
            >
              Friends
            </Link>
          </nav>
        </header>

        <section
          className="
            pb-6
            pt-14
          "
        >
          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.28em]
              text-zinc-600
            "
          >
            Your Binder
          </p>

          <div
            className="
              mt-2
              flex
              items-end
              justify-between
              gap-5
            "
          >
            <div>
              <h1
                className="
                  text-4xl
                  font-semibold
                  tracking-tight
                  sm:text-5xl
                "
              >
                Collection
              </h1>

              <p
                className="
                  mt-3
                  text-sm
                  text-zinc-500
                "
              >
                {
                  cards.length
                }{' '}
                {
                  cards.length ===
                  1
                    ? 'card'
                    : 'cards'
                }{' '}
                in your binder.
              </p>
            </div>

            <Link
              href="/explore"
              className="
                shrink-0
                rounded-full
                bg-white
                px-5
                py-2.5
                text-sm
                font-semibold
                text-black
                transition
                hover:bg-zinc-200
              "
            >
              Find cards
            </Link>
          </div>
        </section>

        {cards.length === 0 ? (
          <section
            className="
              flex
              min-h-[50vh]
              items-center
              justify-center
            "
          >
            <div
              className="
                max-w-md
                text-center
              "
            >
              <h2
                className="
                  text-2xl
                  font-semibold
                "
              >
                Your binder is
                empty.
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-zinc-500
                "
              >
                Love a card while
                exploring and it
                will show up here.
              </p>

              <Link
                href="/explore"
                className="
                  mt-6
                  inline-block
                  rounded-full
                  border
                  border-white/15
                  px-6
                  py-3
                  text-sm
                  font-medium
                  transition
                  hover:border-white/40
                "
              >
                Explore cards
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="
              grid
              grid-cols-2
              gap-x-4
              gap-y-8
              pb-16
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
              xl:grid-cols-6
            "
          >
            {cards.map(
              (card) => (
                <Link
                  key={
                    card.id
                  }
                  href={
                    `/cards/${card.id}`
                  }
                  className="
                    group
                    min-w-0
                  "
                >
                  <div
                    className="
                      overflow-hidden
                      rounded-xl
                      bg-zinc-950
                    "
                  >
                    {card.image_url ? (
                      <img
                        src={
                          card.image_url
                        }
                        alt={
                          card.name
                        }
                        loading="lazy"
                        className="
                          aspect-[2.5/3.5]
                          w-full
                          object-contain
                          transition
                          duration-200
                          group-hover:scale-[1.02]
                        "
                      />
                    ) : (
                      <div
                        className="
                          aspect-[2.5/3.5]
                          w-full
                          bg-zinc-900
                        "
                      />
                    )}
                  </div>

                  <h2
                    className="
                      mt-3
                      truncate
                      text-sm
                      font-medium
                    "
                  >
                    {
                      card.name
                    }
                  </h2>

                  <p
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-zinc-600
                    "
                  >
                    {
                      card.rarity ||
                      'Pokémon card'
                    }
                  </p>
                </Link>
              )
            )}
          </section>
        )}
      </div>
    </main>
  )
}