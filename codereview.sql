create procedure syn.usp_ImportFileCustomerSeasonal -- 1 нет комментария что процудра делает
	@ID_Record int -- 2 нет проверки на 0
as
set nocount on -- 3 нет верхнего регистра
begin -- 4 пропущен пробел для явного разделения
	declare @RowCount int = (select count(*) from syn.SA_CustomerSeasonal) -- 5 @RawCount обьявлен, но не используется
	declare @ErrorMessage varchar(max) -- 6 нет явного пояснения к переменным

-- Проверка на корректность загрузки
	if not exists (
	select 1
	from syn.ImportFile as f
	where f.ID = @ID_Record
		and f.FlagLoaded = cast(1 as bit)
	) 
	
	/* 7 ошибка логики, если в ImprotFile нет записи с нужным ID
	 ,то процедура будет с ошибкой, но без лога */

		begin
			set @ErrorMessage = 'Ошибка при загрузке файла, проверьте корректность данных'

			raiserror(@ErrorMessage, 3, 1) -- 8 устарел, можно использовать throw
			return -- 9 лучше использовать Throw, а после Return добавить коментарий о завершении процедуры
		end

	CREATE TABLE #ProcessedRows(ActionType varchar(255), ID int) -- 10 нет удаления временных таблиц
	-- 11 таблица создается, но нигде не используется

	-- 12 нет проверки существования временной таблицы

	--Чтение из слоя временных данных
	select
		cc.ID as ID_dbo_Customer
		,cst.ID as ID_CustomerSystemType
		,s.ID as ID_Season
		,cast(sa.DateBegin as date) as DateBegin
		,cast(sa.DateEnd as date) as DateEnd
		,cd.ID as ID_dbo_CustomerDistributor
		,cast(isnull(sa.FlagActive, 0) as bit) as FlagActive
	into #CustomerSeasonal -- 13 нет обработки ошибки, если придет ошибка, то сообщения не будет
	from syn.SA_CustomerSeasonal cs -- 14 неоднозначное использование алиасов
		join dbo.Customer as cc on cc.UID_DS = sa.UID_DS_Customer
			and cc.ID_mapping_DataSource = 1
		join dbo.Season as s on s.Name = sa.Season -- 15 неявное указание типо join
		join dbo.Customer as cd on cd.UID_DS = sa.UID_DS_CustomerDistributor
			and cd.ID_mapping_DataSource = 1
		join syn.CustomerSystemType as cst on sa.CustomerSystemType = cst.Name
	where try_cast(sa.DateBegin as date) is not null
		and try_cast(sa.DateEnd as date) is not null
		and try_cast(isnull(sa.FlagActive, 0) as bit) is not null

	-- Определяем некорректные записи
	-- Добавляем причину, по которой запись считается некорректной
	select
		sa.*
		,case
			when cc.ID is null then 'UID клиента отсутствует в справочнике "Клиент"'
			when cd.ID is null then 'UID дистрибьютора отсутствует в справочнике "Клиент"'
			when s.ID is null then 'Сезон отсутствует в справочнике "Сезон"'
			when cst.ID is null then 'Тип клиента в справочнике "Тип клиента"'
			when try_cast(sa.DateBegin as date) is null then 'Невозможно определить Дату начала'
			when try_cast(sa.DateEnd as date) is null then 'Невозможно определить Дату начала' -- 16 должно быть 'Невозможно определить Дату окончания'
			when try_cast(isnull(sa.FlagActive, 0) as bit) is null then 'Невозможно определить Активность' -- 17 если FlagActive всегда 0 или 1 то лучше явно указать тип данных
		end as Reason
	into #BadInsertedRows
	from syn.SA_CustomerSeasonal as cs
	left join dbo.Customer as cc on cc.UID_DS = sa.UID_DS_Customer
		and cc.ID_mapping_DataSource = 1
	left join dbo.Customer as cd on cd.UID_DS = sa.UID_DS_CustomerDistributor and cd.ID_mapping_DataSource = 1
	left join dbo.Season as s on s.Name = sa.Season
	left join syn.CustomerSystemType as cst on cst.Name = sa.CustomerSystemType
	where cc.ID is null
		or cd.ID is null
		or s.ID is null
		or cst.ID is null
		or try_cast(sa.DateBegin as date) is null
		or try_cast(sa.DateEnd as date) is null
		or try_cast(isnull(sa.FlagActive, 0) as bit) is null

		
end
