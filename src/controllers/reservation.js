"use strict"
/* -------------------------------------------------------
    NODEJS EXPRESS | CLARUSWAY FullStack Team
------------------------------------------------------- */
// Reservation Controller:

const Reservation = require('../models/reservation')

module.exports = {

    list: async (req, res) => {
        /*
            #swagger.tags = ["Reservations"]
            #swagger.summary = "List Reservations"
            #swagger.description = `
                You can send query with endpoint for filter[], search[], sort[], page and limit.
                <ul> Examples:
                    <li>URL/?<b>filter[field1]=value1&filter[field2]=value2</b></li>
                    <li>URL/?<b>search[field1]=value1&search[field2]=value2</b></li>
                    <li>URL/?<b>sort[field1]=1&sort[field2]=-1</b></li>
                    <li>URL/?<b>page=2&limit=1</b></li>
                </ul>
            `
        */
        // bir kullanıcının, Başka bir kullanıcı datasını görmesini engelle:
        //sadece kendi bilgilerini görebilsin
        let customFilter = {}
        if (!req.user.isAdmin && !req.user.isStaff) {
            customFilter = { userId: req.user._id }
        }

        const data = await res.getModelList(Reservation, customFilter, [ //populate yaptık
            { path: 'createdId', select: 'username' },
            { path: 'userId', select: 'username firstName lastName' },
            { path: 'carId' }, // select yazmazsak tüm detaylar gelir
            { path: 'updatedId', select: 'username' },
        ])

        res.status(200).send({
            error: false,
            details: await res.getModelListDetails(Reservation, customFilter),
            data
        })
    },

    create: async (req, res) => {
        /*
            #swagger.tags = ["Reservations"]
            #swagger.summary = "Create Reservation"
            #swagger.parameters['body'] = {
                in: 'body',
                required: true,
                schema: {
                    $ref: '#/definitions/Reservation'
                }
            }
        */
        //Eğer req.body de userId gönderilmemişse aşağıdaki senaryoyu kullan;
        // Mevcut kullanıcı "Admin/staff değilse" veya "UserId gönderilmemişse" user._id yi req.user'dan al:
        //Admin veya staff başkası adına da rezervasyon yapabilir o nedenle değilse kontrolü yapıldı
        //req.user demek o anki sistemde olan token almış olan kullanıcı demek
        if ((!req.user.isAdmin && !req.user.isStaff) || !req.body?.userId) {
            req.body.userId = req.user._id
        }

        // createdId ve updatedId verisini req.user'dan al:
        req.body.createdId = req.user._id
        req.body.updatedId = req.user._id

        //kullanıcının çakışan tarihlerde başka araç rezervasyonu var mı?
        const userResevationInDates = await Reservation.findOne({
            userId: req.body.userId, //bu kullanıcı
            // carId: req.body.carId, // Farklı bir araba kiralanabilir
            //önceden bir araç rezervasyonu yapmış mı demek aşağıdaki
            $nor: [
                { startDate: { $gt: req.body.endDate } }, // gt: >
                { endDate: { $lt: req.body.startDate } } // lt: <
            ]

        })

        if (userReservationInDates) {

            res.errorStatusCode = 400
            throw new Error(
                'It cannot be added because there is another reservation with the same date.',
                { cause: { userReservationInDates: userReservationInDates } }
            )

        } else {

            const data = await Reservation.create(req.body)

            res.status(201).send({
                error: false,
                data
            })
        }
    },

    read: async (req, res) => {
        /*
            #swagger.tags = ["Reservations"]
            #swagger.summary = "Get Single Reservation"
        */
        let customFilter = {}
        if (!req.user.isAdmin && !req.user.isStaff) {
            customFilter = { userId: req.user._id }
        }

        const data = await Reservation.findOne({ _id: req.params.id, ...customFilter }).populate([
            { path: 'userId', select: 'username firstName lastName' },
            { path: 'carId' },
            { path: 'createdId', select: 'username' },
            { path: 'updatedId', select: 'username' },
        ])
        res.status(200).send({
            error: false,
            data
        })

    },

    update: async (req, res) => {
        /*
            #swagger.tags = ["Reservations"]
            #swagger.summary = "Update Reservation"
            #swagger.parameters['body'] = {
                in: 'body',
                required: true,
                schema: {
                    $ref: '#/definitions/Reservation'
                }
            }
        */

        // Admin değilse rezervasyona ait userId değiştirilemez:
        //admin, bir rezervasyonun userId sini değiştirebilir
        if (!req.user.isAdmin) {
            delete req.body.userId
        }

        // updatedId verisini req.user'dan al:
        req.body.updatedId = req.user._id

        const data = await Reservation.updateOne({ _id: req.params.id }, req.body, { runValidators: true })

        res.status(202).send({
            error: false,
            data,
            new: await Reservation.findOne({ _id: req.params.id })
        })

    },

    delete: async (req, res) => {
        /*
            #swagger.tags = ["Reservations"]
            #swagger.summary = "Delete Reservation"
        */

        const data = await Reservation.deleteOne({ _id: req.params.id })

        res.status(data.deletedCount ? 204 : 404).send({
            error: !data.deletedCount,
            data
        })

    },
}